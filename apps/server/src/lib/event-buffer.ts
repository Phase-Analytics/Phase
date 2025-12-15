import Redis from 'ioredis';

export type BufferedEvent = {
  eventId: string;
  sessionId: string;
  deviceId: string;
  appId: string;
  name: string;
  params: Record<string, string | number | boolean | null> | null;
  isScreen: boolean;
  timestamp: string;
};

const BUFFER_KEY = 'events:buffer';
const FLUSH_KEY = 'events:flushing';
const FLUSH_INTERVAL_MS = 2000;
const FLUSH_THRESHOLD = 500;
const BATCH_SIZE = 5000;
const MAX_CONCURRENT_WRITES = 10;
const QUESTDB_HTTP = 'http://questdb:9000';
const QUESTDB_TIMEOUT_MS = 30_000;

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

export class EventBuffer {
  private readonly redis: Redis;
  private flushTimer: Timer | null = null;
  private isFlushing = false;
  private isShuttingDown = false;
  private flushPromise: Promise<void> | null = null;
  private pendingCount = 0;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      lazyConnect: false,
    });

    this.redis.on('error', (error) => {
      console.error('[EventBuffer] Redis error:', error.message);
    });
  }

  private validateEvent(event: BufferedEvent): string | null {
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
    if (!event.timestamp || Number.isNaN(new Date(event.timestamp).getTime())) {
      return 'Invalid timestamp';
    }
    return null;
  }

  async push(event: BufferedEvent): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error('EventBuffer is shutting down');
    }

    const validationError = this.validateEvent(event);
    if (validationError) {
      throw new Error(`EventBuffer validation failed: ${validationError}`);
    }

    await this.redis.lpush(BUFFER_KEY, JSON.stringify(event));
    this.pendingCount++;

    if (this.pendingCount >= FLUSH_THRESHOLD) {
      this.triggerFlush();
    }
  }

  async pushMany(events: BufferedEvent[]): Promise<{
    success: number;
    failed: Array<{ index: number; error: string }>;
  }> {
    if (this.isShuttingDown) {
      throw new Error('EventBuffer is shutting down');
    }

    if (events.length === 0) {
      return { success: 0, failed: [] };
    }

    const validEvents: Array<{ index: number; event: BufferedEvent }> = [];
    const failed: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const validationError = this.validateEvent(event);
      if (validationError) {
        failed.push({ index: i, error: validationError });
      } else {
        validEvents.push({ index: i, event });
      }
    }

    if (validEvents.length === 0) {
      return { success: 0, failed };
    }

    const pipeline = this.redis.pipeline();
    for (const { event } of validEvents) {
      pipeline.lpush(BUFFER_KEY, JSON.stringify(event));
    }

    const results = await pipeline.exec();

    if (results) {
      for (let i = 0; i < results.length; i++) {
        const [err] = results[i];
        if (err) {
          const originalIndex = validEvents[i].index;
          failed.push({ index: originalIndex, error: err.message });
        }
      }
    }

    const successCount =
      validEvents.length - (results?.filter(([err]) => err).length ?? 0);

    this.pendingCount += successCount;

    if (this.pendingCount >= FLUSH_THRESHOLD) {
      this.triggerFlush();
    }

    return { success: successCount, failed };
  }

  private triggerFlush(): void {
    this.pendingCount = 0;
    this.flush().catch((err) => {
      console.error('[EventBuffer] Triggered flush error:', err);
    });
  }

  start(): void {
    if (this.flushTimer) {
      return;
    }

    this.flushTimer = setInterval(() => {
      this.flush().catch((err) => {
        console.error('[EventBuffer] Flush error:', err);
      });
    }, FLUSH_INTERVAL_MS);
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private async flush(): Promise<void> {
    if (this.isFlushing) {
      if (this.flushPromise) {
        await this.flushPromise;
      }
      return;
    }

    this.isFlushing = true;
    this.flushPromise = this.doFlush();

    try {
      await this.flushPromise;
    } finally {
      this.isFlushing = false;
      this.flushPromise = null;
    }
  }

  private async doFlush(): Promise<void> {
    const bufferExists = await this.redis.exists(BUFFER_KEY);
    if (bufferExists === 0) {
      return;
    }

    const swapped = await this.redis.renamenx(BUFFER_KEY, FLUSH_KEY);
    if (swapped === 0) {
      const flushExists = await this.redis.exists(FLUSH_KEY);
      if (flushExists === 0) {
        return;
      }
    }

    this.pendingCount = 0;
    await this.processBatches();
  }

  private async processBatches(): Promise<void> {
    while (true) {
      const totalLen = await this.redis.llen(FLUSH_KEY);
      if (totalLen === 0) {
        await this.redis.del(FLUSH_KEY);
        break;
      }

      const batchCount = Math.ceil(totalLen / BATCH_SIZE);
      const concurrentBatches = Math.min(batchCount, MAX_CONCURRENT_WRITES);

      const batchPromises: Promise<{ success: boolean; count: number }>[] = [];

      for (let i = 0; i < concurrentBatches; i++) {
        batchPromises.push(this.processSingleBatch());
      }

      const results = await Promise.all(batchPromises);

      const allSuccess = results.every((r) => r.success);
      const totalProcessed = results.reduce((sum, r) => sum + r.count, 0);

      if (!allSuccess || totalProcessed === 0) {
        break;
      }
    }
  }

  private async processSingleBatch(): Promise<{
    success: boolean;
    count: number;
  }> {
    const rawEvents = await this.redis.lrange(FLUSH_KEY, -BATCH_SIZE, -1);

    if (rawEvents.length === 0) {
      return { success: true, count: 0 };
    }

    const events: BufferedEvent[] = [];
    for (const raw of rawEvents) {
      try {
        events.push(JSON.parse(raw));
      } catch {
        console.error('[EventBuffer] Invalid JSON in buffer, skipping');
      }
    }

    if (events.length > 0) {
      const success = await this.writeBatchToQuestDB(events);
      if (success) {
        await this.redis.ltrim(FLUSH_KEY, 0, -(rawEvents.length + 1));
        return { success: true, count: events.length };
      }
      return { success: false, count: 0 };
    }

    await this.redis.ltrim(FLUSH_KEY, 0, -(rawEvents.length + 1));
    return { success: true, count: 0 };
  }

  private buildILPLines(events: BufferedEvent[]): string {
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
        ]
          .filter(Boolean)
          .join(',');

        const timestampNanos = new Date(event.timestamp).getTime() * 1_000_000;

        return `events,${tags} ${fields} ${timestampNanos}`;
      })
      .join('\n');
  }

  private async writeILP(ilpData: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), QUESTDB_TIMEOUT_MS);

    try {
      const response = await fetch(`${QUESTDB_HTTP}/write`, {
        method: 'POST',
        body: ilpData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`QuestDB error: ${response.status} - ${errorText}`);
      }

      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`QuestDB timeout after ${QUESTDB_TIMEOUT_MS}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async writeBatchToQuestDB(events: BufferedEvent[]): Promise<boolean> {
    if (events.length === 0) {
      return true;
    }

    try {
      const ilpData = this.buildILPLines(events);
      await this.writeILP(ilpData);
      return true;
    } catch (error) {
      console.error(
        '[EventBuffer] Batch insert failed, falling back to individual writes:',
        error
      );

      return await this.writeEventsIndividually(events);
    }
  }

  private async writeEventsIndividually(
    events: BufferedEvent[]
  ): Promise<boolean> {
    for (const event of events) {
      try {
        const ilpData = this.buildILPLines([event]);
        await this.writeILP(ilpData);
      } catch (error) {
        await this.sendToDeadLetterQueue(event, error);
      }
    }

    return true;
  }

  private async sendToDeadLetterQueue(
    event: BufferedEvent,
    error: unknown
  ): Promise<void> {
    try {
      const dlqEntry = {
        event,
        error: error instanceof Error ? error.message : String(error),
        failedAt: new Date().toISOString(),
      };
      await this.redis.lpush('events:dlq', JSON.stringify(dlqEntry));
    } catch (dlqError) {
      console.error(
        `[EventBuffer] Failed to send event ${event.eventId} to DLQ:`,
        dlqError
      );
    }
  }

  async flushAndClose(): Promise<void> {
    this.isShuttingDown = true;
    this.stop();

    let retries = 3;
    while (retries > 0) {
      try {
        await this.flush();
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error(
            '[EventBuffer] Failed to flush on shutdown after retries:',
            error
          );
        }
      }
    }

    await this.redis.quit();
  }

  async getBufferSize(): Promise<number> {
    const bufferLen = await this.redis.llen(BUFFER_KEY);
    const flushLen = await this.redis.llen(FLUSH_KEY);
    return bufferLen + flushLen;
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
