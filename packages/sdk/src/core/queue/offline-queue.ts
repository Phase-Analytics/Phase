import { getItem, removeItem, setItem } from '../storage/storage';
import type { BatchItem } from '../types';
import { STORAGE_KEYS } from '../types';
import { generateEventId } from '../utils/id-generator';
import { logger } from '../utils/logger';

const MAX_QUEUE_ITEMS = 1000;
// Android AsyncStorage reads rows through a ~2MB CursorWindow; stay well below it.
const MAX_QUEUE_BYTES = 1_500_000;
const PERSIST_DEBOUNCE_MS = 1000;
const ITEM_TYPES = new Set(['device', 'session', 'event', 'ping']);

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

export type QueueInput = DistributiveOmit<
  BatchItem,
  'clientOrder' | 'retryCount'
>;

function utf8Length(value: string): number {
  let bytes = 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x80) {
      bytes += 1;
    } else if (code < 0x8_00) {
      bytes += 2;
    } else if (code >= 0xd8_00 && code <= 0xdb_ff) {
      bytes += 4;
      i++;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

function isBatchItem(value: unknown): value is BatchItem {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item.type === 'string' &&
    ITEM_TYPES.has(item.type) &&
    typeof item.clientOrder === 'number' &&
    Number.isFinite(item.clientOrder) &&
    item.clientOrder >= 0 &&
    typeof item.payload === 'object' &&
    item.payload !== null
  );
}

function sessionIdOf(item: BatchItem): string | null {
  return item.type === 'device' ? null : item.payload.sessionId;
}

/**
 * Durable FIFO of batch items. Items stay here until the server acknowledges
 * them; persistence is debounced so enqueueing stays O(1).
 */
export class OfflineQueue {
  private items: BatchItem[] = [];
  private readonly sizes = new WeakMap<BatchItem, number>();
  private totalBytes = 0;
  private nextClientOrder = 0;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private persistChain: Promise<void> = Promise.resolve();
  private dirty = false;
  private enqueueListener: ((item: BatchItem) => void) | null = null;

  async initialize(): Promise<void> {
    const result = await getItem<unknown>(STORAGE_KEYS.OFFLINE_QUEUE);

    if (!result.success) {
      // e.g. a row too large for Android's CursorWindow: start fresh rather than fail forever.
      logger.warn(
        'Could not read the offline queue. Starting with an empty queue.'
      );
      await removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
      return;
    }

    if (result.data === null) {
      return;
    }

    if (!Array.isArray(result.data)) {
      logger.warn(
        'Stored offline queue is malformed. Starting with an empty queue.'
      );
      await removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
      return;
    }

    const valid = result.data.filter(isBatchItem);
    if (valid.length < result.data.length) {
      logger.warn(
        `Dropped ${result.data.length - valid.length} malformed item(s) from the stored offline queue.`
      );
      this.dirty = true;
    }

    valid.sort((a, b) => a.clientOrder - b.clientOrder);
    for (const item of valid) {
      // Items queued by older SDK versions have no eventId; assign one now so retries dedup.
      if (item.type === 'event' && !item.payload.eventId) {
        item.payload.eventId = generateEventId();
        this.dirty = true;
      }
      this.add(item);
      this.nextClientOrder = Math.max(
        this.nextClientOrder,
        item.clientOrder + 1
      );
    }

    if (this.enforceLimits()) {
      this.dirty = true;
    }
    if (this.dirty) {
      this.schedulePersist();
    }
  }

  setEnqueueListener(listener: ((item: BatchItem) => void) | null): void {
    this.enqueueListener = listener;
  }

  enqueue(input: QueueInput): void {
    if (input.type === 'ping') {
      // Only the latest heartbeat of a session matters.
      const { sessionId } = input.payload;
      this.removeWhere(
        (queued) =>
          queued.type === 'ping' && queued.payload.sessionId === sessionId
      );
    }

    const item = { ...input, clientOrder: this.nextClientOrder++ } as BatchItem;
    this.add(item);
    this.enforceLimits();
    this.schedulePersist();
    this.enqueueListener?.(item);
  }

  /** Items in send order. The returned objects are live queue entries. */
  snapshot(): BatchItem[] {
    return [...this.items];
  }

  /** Removes the given entries (if still queued) and persists any in-place changes. */
  remove(items: ReadonlySet<BatchItem>): void {
    this.removeWhere((item) => items.has(item));
    this.schedulePersist();
  }

  getSize(): number {
    return this.items.length;
  }

  async clear(): Promise<void> {
    this.cancelPersistTimer();
    this.items = [];
    this.totalBytes = 0;
    this.dirty = false;
    this.persistChain = this.persistChain.then(async () => {
      const result = await removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
      if (!result.success) {
        logger.error('Failed to clear the stored offline queue.');
      }
    });
    await this.persistChain;
  }

  persistNow(): Promise<void> {
    this.cancelPersistTimer();
    if (!this.dirty) {
      return this.persistChain;
    }

    this.dirty = false;
    this.persistChain = this.persistChain.then(async () => {
      const result = await setItem(STORAGE_KEYS.OFFLINE_QUEUE, this.items);
      if (!result.success) {
        this.dirty = true;
        logger.error(
          'Failed to persist the offline queue. Data may be lost on app exit.'
        );
      }
    });
    return this.persistChain;
  }

  private schedulePersist(): void {
    this.dirty = true;
    if (this.persistTimer) {
      return;
    }
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.persistNow().catch(() => {
        // persistNow() logs its own failures.
      });
    }, PERSIST_DEBOUNCE_MS);
  }

  private cancelPersistTimer(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
  }

  private add(item: BatchItem): void {
    const size = utf8Length(JSON.stringify(item)) + 1;
    this.sizes.set(item, size);
    this.totalBytes += size;
    this.items.push(item);
  }

  private removeWhere(predicate: (item: BatchItem) => boolean): number {
    const before = this.items.length;
    this.items = this.items.filter((item) => {
      if (!predicate(item)) {
        return true;
      }
      this.totalBytes -= this.sizes.get(item) ?? 0;
      return false;
    });
    return before - this.items.length;
  }

  private enforceLimits(): boolean {
    let trimmed = false;
    while (
      this.items.length > MAX_QUEUE_ITEMS ||
      (this.totalBytes > MAX_QUEUE_BYTES && this.items.length > 1)
    ) {
      this.dropOldest();
      trimmed = true;
    }
    return trimmed;
  }

  /**
   * Drops the oldest whole session. If only one session is queued, drops its
   * oldest event/ping instead so the session itself can still be created.
   */
  private dropOldest(): void {
    let oldestSessionId: string | null = null;
    let newestSessionId: string | null = null;
    for (const item of this.items) {
      const sessionId = sessionIdOf(item);
      if (sessionId !== null) {
        if (oldestSessionId === null) {
          oldestSessionId = sessionId;
        }
        newestSessionId = sessionId;
      }
    }

    if (oldestSessionId === null) {
      this.removeWhere((item) => item === this.items[0]);
      logger.warn('Offline queue full. Dropped the oldest item.');
      return;
    }

    if (oldestSessionId === newestSessionId) {
      const victim = this.items.find(
        (item) => item.type === 'event' || item.type === 'ping'
      );
      const target = victim ?? this.items[0];
      this.removeWhere((item) => item === target);
      logger.warn('Offline queue full. Dropped the oldest event.');
      return;
    }

    const dropped = this.removeWhere(
      (item) => sessionIdOf(item) === oldestSessionId
    );
    logger.warn(
      `Offline queue full. Dropped ${dropped} item(s) from the oldest session.`,
      { sessionId: oldestSessionId }
    );
  }
}
