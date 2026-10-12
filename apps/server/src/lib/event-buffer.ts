import Redis from 'ioredis';
import { ulid } from 'ulid';
import { QUESTDB_EVENT_WRITE_TABLE } from './questdb-events';

export type BufferedEvent = {
  eventId: string;
  sessionId: string;
  deviceId: string;
  appId: string;
  name: string;
  params: Record<string, string | number | boolean | null> | null;
  isScreen: boolean;
  isDebug: boolean;
  timestamp: string;
};

type EventBufferOptions = {
  questdbUrl?: string;
};

type WriteResult = { ok: true } | { ok: false; retryable: boolean; message: string };

type PendingWrite = { event: BufferedEvent; attempts: number };

type DeadLetterEntry = {
  event: BufferedEvent;
  error: string;
  failedAt: string;
  attempts?: number;
};

type ClaimOutcome = 'empty' | 'written' | 'failed';

// New events are LPUSHed onto the head; chunks are claimed from the tail.
const BUFFER_KEY = 'events:buffer';
// Written by the previous renamenx-based flusher; drained before the buffer.
const LEGACY_FLUSH_KEY = 'events:flushing';
// Each claimed chunk lives in its own list until QuestDB acknowledges it; the
// sorted set records claim times so a crashed worker's chunk is requeued.
const INFLIGHT_INDEX_KEY = 'events:inflight';
const INFLIGHT_KEY_PREFIX = 'events:inflight:';
const DLQ_KEY = 'events:dlq';

const FLUSH_INTERVAL_MS = 2000;
const FLUSH_THRESHOLD = 500;
const BATCH_SIZE = 1000;
const MAX_CONCURRENT_WRITES = 4;
const QUESTDB_TIMEOUT_MS = 30_000;
const INFLIGHT_LEASE_MS = 5 * 60_000;
const REAP_INTERVAL_MS = 30_000;
const BACKOFF_INITIAL_MS = 1000;
const BACKOFF_MAX_MS = 60_000;
const DLQ_MAX_ENTRIES = 50_000;
const DLQ_TTL_SECONDS = 14 * 24 * 60 * 60;
const DLQ_REPLAY_INTERVAL_MS = 5 * 60_000;
const DLQ_REPLAY_BATCH = 500;
const DLQ_MAX_ATTEMPTS = 5;

const CLAIM_SCRIPT = `
local source = KEYS[1]
local items = redis.call('LRANGE', source, -tonumber(ARGV[1]), -1)
if #items == 0 then
  source = KEYS[2]
  items = redis.call('LRANGE', source, -tonumber(ARGV[1]), -1)
end
if #items == 0 then
  return items
end
redis.call('LTRIM', source, 0, -(#items + 1))
for i = 1, #items, 500 do
  redis.call('RPUSH', KEYS[3], unpack(items, i, math.min(i + 499, #items)))
end
redis.call('ZADD', KEYS[4], ARGV[2], KEYS[3])
return items
`;

const REQUEUE_SCRIPT = `
local items = redis.call('LRANGE', KEYS[1], 0, -1)
for i = 1, #items, 500 do
  redis.call('RPUSH', KEYS[2], unpack(items, i, math.min(i + 499, #items)))
end
redis.call('DEL', KEYS[1])
redis.call('ZREM', KEYS[3], KEYS[1])
return #items
`;

class TransientWriteError extends Error {}

function escapeILPString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

function escapeILPTag(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/=/g, '\\=')
    .replace(/ /g, '\\ ')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

function buildILPLines(events: BufferedEvent[]): string {
  return events
    .map((event) => {
      const tags = [
        `app_id=${escapeILPTag(event.appId)}`,
        `device_id=${escapeILPTag(event.deviceId)}`,
        `session_id=${escapeILPTag(event.sessionId)}`,
        `name=${escapeILPTag(event.name)}`,
      ].join(',');

      const paramsField =
        event.params !== null
          ? `params="${escapeILPString(JSON.stringify(event.params))}"`
          : '';

      const fields = [
        `event_id="${escapeILPString(event.eventId)}"`,
        paramsField,
        `is_screen=${event.isScreen ? 't' : 'f'}`,
        `is_debug=${event.isDebug ? 't' : 'f'}`,
      ]
        .filter(Boolean)
        .join(',');

      const timestampNanos = new Date(event.timestamp).getTime() * 1_000_000;

      return `${QUESTDB_EVENT_WRITE_TABLE},${tags} ${fields} ${timestampNanos}`;
    })
    .join('\n');
}

function validateEvent(event: BufferedEvent): string | null {
  if (!event.eventId || typeof event.eventId !== 'string') {
    return 'Invalid eventId';
  }
  if (!event.sessionId || typeof event.sessionId !== 'string') {
    return 'Invalid sessionId';
  }
  if (!event.deviceId || typeof event.deviceId !== 'string') {
    return 'Invalid deviceId';
  }
  if (!event.appId || typeof event.appId !== 'string') {
    return 'Invalid appId';
  }
  if (!event.name || typeof event.name !== 'string') {
    return 'Invalid name';
  }
  if (typeof event.isDebug !== 'boolean') {
    return 'Invalid isDebug';
  }
  if (!event.timestamp || Number.isNaN(new Date(event.timestamp).getTime())) {
    return 'Invalid timestamp';
  }
  return null;
}

/**
 * Redis-backed write buffer in front of QuestDB. Delivery is at-least-once:
 * chunks are claimed atomically into per-claim in-flight lists, so replicas
 * never share a chunk and a crash only causes a re-write, which QuestDB's
 * DEDUP UPSERT KEYS(timestamp, event_id) absorbs.
 */
export class EventBuffer {
  private readonly redis: Redis;
  private readonly questdbUrl: string;
  private flushTimer: Timer | null = null;
  private isShuttingDown = false;
  private flushPromise: Promise<void> | null = null;
  private pendingCount = 0;
  private backoffUntil = 0;
  private backoffMs = 0;
  private lastReapAt = 0;
  private lastReplayAt = Date.now();

  constructor(redisUrl: string, options: EventBufferOptions = {}) {
    this.questdbUrl = options.questdbUrl ?? 'http://questdb:9000';
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      lazyConnect: false,
    });

    this.redis.on('error', (error) => {
      console.error('[EventBuffer] Redis error:', error.message);
    });
  }

  async push(event: BufferedEvent): Promise<void> {
    const result = await this.pushMany([event]);
    const failure = result.failed[0];
    if (failure) {
      throw new Error(`EventBuffer validation failed: ${failure.error}`);
    }
  }

  /**
   * Validates and appends events with a single LPUSH, so the valid events are
   * buffered all-or-nothing. Throws when Redis rejects the write.
   */
  async pushMany(events: BufferedEvent[]): Promise<{
    success: number;
    failed: Array<{ index: number; error: string }>;
  }> {
    if (this.isShuttingDown) {
      throw new Error('EventBuffer is shutting down');
    }

    const serialized: string[] = [];
    const failed: Array<{ index: number; error: string }> = [];

    for (const [index, event] of events.entries()) {
      const validationError = validateEvent(event);
      if (validationError) {
        failed.push({ index, error: validationError });
      } else {
        serialized.push(JSON.stringify(event));
      }
    }

    if (serialized.length > 0) {
      await this.redis.lpush(BUFFER_KEY, ...serialized);
      this.pendingCount += serialized.length;
      if (this.pendingCount >= FLUSH_THRESHOLD) {
        this.pendingCount = 0;
        this.runFlush();
      }
    }

    return { success: serialized.length, failed };
  }

  start(): void {
    if (this.flushTimer) {
      return;
    }
    this.flushTimer = setInterval(() => this.runFlush(), FLUSH_INTERVAL_MS);
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private runFlush(): void {
    this.flush().catch((error) => {
      console.error('[EventBuffer] Flush error:', error);
    });
  }

  /** Runs one drain pass; concurrent callers share the in-progress pass. */
  flush(): Promise<void> {
    if (!this.flushPromise) {
      this.flushPromise = this.drain().finally(() => {
        this.flushPromise = null;
      });
    }
    return this.flushPromise;
  }

  private async drain(deadline = Number.POSITIVE_INFINITY): Promise<void> {
    if (Date.now() < this.backoffUntil) {
      return;
    }

    if (Date.now() - this.lastReapAt >= REAP_INTERVAL_MS) {
      this.lastReapAt = Date.now();
      await this.requeueExpiredClaims();
    }

    while (Date.now() < deadline) {
      const outcomes = await Promise.all(
        Array.from({ length: MAX_CONCURRENT_WRITES }, () =>
          this.processChunk()
        )
      );

      if (outcomes.includes('failed')) {
        this.enterBackoff();
        return;
      }
      if (outcomes.every((outcome) => outcome === 'empty')) {
        break;
      }
    }

    if (
      !this.isShuttingDown &&
      Date.now() - this.lastReplayAt >= DLQ_REPLAY_INTERVAL_MS
    ) {
      this.lastReplayAt = Date.now();
      await this.replayDeadLetters();
    }
  }

  private enterBackoff(): void {
    this.backoffMs = Math.min(
      this.backoffMs ? this.backoffMs * 2 : BACKOFF_INITIAL_MS,
      BACKOFF_MAX_MS
    );
    this.backoffUntil = Date.now() + this.backoffMs;
    console.warn(
      `[EventBuffer] QuestDB write failed; retrying in ${this.backoffMs}ms`
    );
  }

  private async processChunk(): Promise<ClaimOutcome> {
    const claimKey = `${INFLIGHT_KEY_PREFIX}${ulid()}`;
    const rawEvents = (await this.redis.eval(
      CLAIM_SCRIPT,
      4,
      LEGACY_FLUSH_KEY,
      BUFFER_KEY,
      claimKey,
      INFLIGHT_INDEX_KEY,
      String(BATCH_SIZE),
      String(Date.now())
    )) as string[];

    if (rawEvents.length === 0) {
      return 'empty';
    }

    const pending: PendingWrite[] = [];
    for (const raw of rawEvents) {
      try {
        pending.push({ event: JSON.parse(raw), attempts: 0 });
      } catch {
        console.error('[EventBuffer] Dropping unparsable buffered event');
      }
    }

    try {
      await this.writeWithSplit(pending);
    } catch (error) {
      console.error('[EventBuffer] Chunk write failed, requeueing:', error);
      await this.requeueClaim(claimKey);
      return 'failed';
    }

    this.backoffMs = 0;
    await this.redis
      .multi()
      .del(claimKey)
      .zrem(INFLIGHT_INDEX_KEY, claimKey)
      .exec();
    return 'written';
  }

  /**
   * Writes the events in one request. Transient failures throw so the whole
   * claim is retried; a rejected payload is bisected until the offending
   * events are isolated and dead-lettered.
   */
  private async writeWithSplit(pending: PendingWrite[]): Promise<void> {
    if (pending.length === 0) {
      return;
    }

    const result = await this.writeILP(
      buildILPLines(pending.map(({ event }) => event))
    );
    if (result.ok) {
      return;
    }
    if (result.retryable) {
      throw new TransientWriteError(result.message);
    }

    const [single] = pending;
    if (pending.length === 1 && single) {
      await this.deadLetter(single, result.message);
      return;
    }

    const middle = Math.ceil(pending.length / 2);
    await this.writeWithSplit(pending.slice(0, middle));
    await this.writeWithSplit(pending.slice(middle));
  }

  private async writeILP(body: string): Promise<WriteResult> {
    let response: Response;
    try {
      response = await fetch(`${this.questdbUrl}/write`, {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(QUESTDB_TIMEOUT_MS),
      });
    } catch (error) {
      return {
        ok: false,
        retryable: true,
        message: error instanceof Error ? error.message : String(error),
      };
    }

    if (response.ok) {
      return { ok: true };
    }

    const text = await response.text().catch(() => '');
    // 400/413/422 mean QuestDB rejected the payload itself; anything else
    // (5xx, auth, throttling) says nothing about the data and is retried.
    const rejected = [400, 413, 422].includes(response.status);
    return {
      ok: false,
      retryable: !rejected,
      message: `QuestDB ${response.status}: ${text.slice(0, 500)}`,
    };
  }

  private async deadLetter(item: PendingWrite, error: string): Promise<void> {
    const entry: DeadLetterEntry = {
      event: item.event,
      error,
      failedAt: new Date().toISOString(),
      attempts: item.attempts + 1,
    };
    console.error(
      `[EventBuffer] Dead-lettering event ${item.event.eventId}: ${error}`
    );
    await this.redis
      .multi()
      .lpush(DLQ_KEY, JSON.stringify(entry))
      .ltrim(DLQ_KEY, 0, DLQ_MAX_ENTRIES - 1)
      .expire(DLQ_KEY, DLQ_TTL_SECONDS)
      .exec();
  }

  private async requeueClaim(claimKey: string): Promise<void> {
    try {
      await this.redis.eval(
        REQUEUE_SCRIPT,
        3,
        claimKey,
        BUFFER_KEY,
        INFLIGHT_INDEX_KEY
      );
    } catch (error) {
      // The claim stays indexed and is recovered once its lease expires.
      console.error(`[EventBuffer] Failed to requeue ${claimKey}:`, error);
    }
  }

  private async requeueExpiredClaims(): Promise<void> {
    const expired = await this.redis.zrangebyscore(
      INFLIGHT_INDEX_KEY,
      '-inf',
      Date.now() - INFLIGHT_LEASE_MS,
      'LIMIT',
      0,
      100
    );
    for (const claimKey of expired) {
      console.warn(`[EventBuffer] Requeueing expired claim ${claimKey}`);
      await this.requeueClaim(claimKey);
    }
  }

  /**
   * Retries a bounded slice of dead letters so events rejected because of a
   * since-fixed schema problem are recovered; entries are dropped after
   * DLQ_MAX_ATTEMPTS rejections.
   */
  private async replayDeadLetters(): Promise<void> {
    const raw = await this.redis.rpop(DLQ_KEY, DLQ_REPLAY_BATCH);
    if (!raw || raw.length === 0) {
      return;
    }

    const pending: PendingWrite[] = [];
    let dropped = 0;
    for (const value of raw) {
      try {
        const entry = JSON.parse(value) as DeadLetterEntry;
        const attempts = entry.attempts ?? 0;
        if (attempts >= DLQ_MAX_ATTEMPTS || validateEvent(entry.event)) {
          dropped++;
        } else {
          pending.push({ event: entry.event, attempts });
        }
      } catch {
        dropped++;
      }
    }
    if (dropped > 0) {
      console.error(
        `[EventBuffer] Dropped ${dropped} dead letters after ${DLQ_MAX_ATTEMPTS} attempts or as unreadable`
      );
    }

    try {
      await this.writeWithSplit(pending);
      console.log(`[EventBuffer] Replayed ${pending.length} dead letters`);
    } catch (error) {
      console.error('[EventBuffer] Dead letter replay deferred:', error);
      // Put the untouched entries back at the tail so they are retried first.
      await this.redis.rpush(DLQ_KEY, ...raw);
    }
  }

  /**
   * Stops the timer and drains what it can before the deadline. Anything
   * left stays in Redis and is picked up by the next process.
   */
  async flushAndClose(deadline: number): Promise<void> {
    this.stop();
    this.isShuttingDown = true;

    try {
      await this.flushPromise;
      this.backoffUntil = 0;
      await this.drain(deadline);
    } catch (error) {
      console.error('[EventBuffer] Shutdown flush failed:', error);
    }

    await this.redis.quit();
  }

  async getBufferSize(): Promise<number> {
    const [bufferLen, legacyLen, claimKeys] = await Promise.all([
      this.redis.llen(BUFFER_KEY),
      this.redis.llen(LEGACY_FLUSH_KEY),
      this.redis.zrange(INFLIGHT_INDEX_KEY, 0, -1),
    ]);
    const claimLens = await Promise.all(
      claimKeys.map((key) => this.redis.llen(key))
    );
    return (
      bufferLen + legacyLen + claimLens.reduce((sum, len) => sum + len, 0)
    );
  }
}

let instance: EventBuffer | null = null;

export function initEventBuffer(redisUrl: string): EventBuffer {
  if (instance) {
    return instance;
  }
  instance = new EventBuffer(redisUrl);
  return instance;
}

export function getEventBuffer(): EventBuffer {
  if (!instance) {
    throw new Error(
      'EventBuffer not initialized. Call initEventBuffer() first.'
    );
  }
  return instance;
}
