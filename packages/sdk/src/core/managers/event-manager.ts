import type { OfflineQueue } from '../queue/offline-queue';
import type { EventParams } from '../types';
import { generateEventId } from '../utils/id-generator';
import { logger } from '../utils/logger';
import { EventDeduplicator, RateLimiter } from '../utils/rate-limiter';
import { validateEventName, validateEventParams } from '../utils/validator';

const MAX_PENDING_EVENTS = 200;
// Older buffered events would fall outside any session the server accepts.
const MAX_PENDING_AGE_MS = 60 * 60 * 1000;

type CapturedEvent = {
  eventId: string;
  name: string;
  params?: EventParams;
  isScreen: boolean;
  timestampMs: number;
};

export type EventSink = {
  queue: OfflineQueue;
  getSessionId: () => string | null;
  markActivity: () => void;
};

/**
 * Validates and stamps events at call time (id + timestamp), then queues them,
 * or buffers them until a session exists (before init/identify).
 */
export class EventManager {
  private readonly rateLimiter = new RateLimiter();
  private readonly deduplicator = new EventDeduplicator();
  private pending: CapturedEvent[] = [];
  private sink: EventSink | null = null;

  track(name: string, params?: EventParams, isScreen = false): void {
    if (!validateEventName(name).success) {
      logger.error(
        'Invalid event name. Use alphanumeric, _, -, ., /, or space'
      );
      return;
    }

    const paramsValidation = validateEventParams(params);
    if (!paramsValidation.success) {
      logger.error(
        'Invalid event params. Use up to 32 primitive keys. Keys max 32 chars. String values max 256 chars. Payload max 8 KB.'
      );
      return;
    }
    const normalizedParams = paramsValidation.data;

    if (!this.rateLimiter.canTrack()) {
      return;
    }

    if (this.deduplicator.isDuplicate(name, normalizedParams)) {
      logger.warn('Duplicate event detected. Ignoring.', { name });
      return;
    }

    const event: CapturedEvent = {
      eventId: generateEventId(),
      name,
      params: normalizedParams,
      isScreen,
      timestampMs: Date.now(),
    };

    if (!this.write(event)) {
      this.buffer(event);
    }
  }

  /** Earliest timestamp among buffered events that can still be delivered. */
  getEarliestPendingMs(): number | undefined {
    this.dropExpired();
    return this.pending[0]?.timestampMs;
  }

  /** Starts delivering to the queue and replays the buffer (no rate limit/dedup again). */
  attach(sink: EventSink): void {
    this.sink = sink;
    this.dropExpired();

    const buffered = this.pending;
    this.pending = [];
    if (buffered.length > 0) {
      logger.info(
        `Replaying ${buffered.length} event(s) tracked before identify()`
      );
    }
    for (const event of buffered) {
      if (!this.write(event)) {
        this.buffer(event);
      }
    }
  }

  detach(): void {
    this.sink = null;
  }

  private write(event: CapturedEvent): boolean {
    const sessionId = this.sink?.getSessionId();
    if (!(this.sink && sessionId)) {
      return false;
    }

    this.sink.queue.enqueue({
      type: 'event',
      payload: {
        eventId: event.eventId,
        sessionId,
        name: event.name,
        params: event.params,
        isScreen: event.isScreen,
        timestamp: new Date(event.timestampMs).toISOString(),
      },
    });
    this.sink.markActivity();
    return true;
  }

  private buffer(event: CapturedEvent): void {
    if (this.pending.length >= MAX_PENDING_EVENTS) {
      const dropped = this.pending.shift();
      logger.warn(
        `More than ${MAX_PENDING_EVENTS} events tracked before identify(). Dropping the oldest.`,
        { name: dropped?.name }
      );
    }
    this.pending.push(event);
  }

  private dropExpired(): void {
    const cutoff = Date.now() - MAX_PENDING_AGE_MS;
    const before = this.pending.length;
    this.pending = this.pending.filter((event) => event.timestampMs >= cutoff);
    if (this.pending.length < before) {
      logger.warn(
        `Dropped ${before - this.pending.length} event(s) buffered for over an hour without identify().`
      );
    }
  }
}
