import { getItem, removeItem, setItem } from '../storage/storage';
import type { BatchItem } from '../types';
import { STORAGE_KEYS } from '../types';
import { logger } from '../utils/logger';

const MAX_QUEUE_SIZE = 5000;

export class OfflineQueue {
  private queue: BatchItem[] = [];
  private clientOrder = 0;
  private operationQueue = Promise.resolve();
  private initialized = false;

  async initialize(): Promise<void> {
    const result = await getItem<BatchItem[]>(STORAGE_KEYS.OFFLINE_QUEUE);
    if (
      result.success &&
      result.data &&
      Array.isArray(result.data) &&
      result.data.length > 0
    ) {
      this.queue = result.data;
      const orders = result.data
        .map((item) => item.clientOrder)
        .filter((order): order is number => typeof order === 'number');

      this.clientOrder = orders.length > 0 ? Math.max(...orders) + 1 : 0;
    }
    this.initialized = true;
  }

  enqueue(item: Omit<BatchItem, 'clientOrder'> | BatchItem): Promise<void> {
    if (!this.initialized) {
      logger.error('OfflineQueue not initialized, call initialize() first');
      return Promise.resolve();
    }

    const previousOp = this.operationQueue;
    this.operationQueue = previousOp.then(async () => {
      if (this.queue.length >= MAX_QUEUE_SIZE) {
        this.dropOldestSession();
      }

      const isRequeue =
        'clientOrder' in item && typeof item.clientOrder === 'number';

      const queueItem: BatchItem = isRequeue
        ? (item as BatchItem)
        : ({ ...item, clientOrder: this.clientOrder++ } as BatchItem);

      this.queue.push(queueItem);

      const result = await this.persist();
      if (!result.success) {
        logger.error(
          'Failed to persist queue after enqueue, data may be lost on crash'
        );
      }
    });
    return this.operationQueue;
  }

  private dropOldestSession(): void {
    const sessionItems = this.queue.filter((item) => item.type === 'session');

    if (sessionItems.length === 0) {
      const dropped = this.queue.shift();
      logger.debug(
        `Queue full (${MAX_QUEUE_SIZE}), no sessions to drop, dropping oldest item`,
        {
          type: dropped?.type,
          clientOrder: dropped?.clientOrder,
        }
      );
      return;
    }

    const oldestSession = sessionItems.reduce((oldest, current) =>
      current.clientOrder < oldest.clientOrder ? current : oldest
    );

    const oldestSessionId = oldestSession.payload.sessionId;

    const initialLength = this.queue.length;
    this.queue = this.queue.filter((item) => {
      if (item.type === 'device') {
        return true;
      }

      if (item.type === 'session') {
        return item.payload.sessionId !== oldestSessionId;
      }

      if (item.type === 'event' || item.type === 'ping') {
        return item.payload.sessionId !== oldestSessionId;
      }

      return true;
    });

    const droppedCount = initialLength - this.queue.length;
    logger.debug(
      `Queue full (${MAX_QUEUE_SIZE}), dropped oldest session and related items`,
      {
        sessionId: oldestSessionId,
        droppedCount,
      }
    );
  }

  async dequeueAll(): Promise<BatchItem[]> {
    const previousOp = this.operationQueue;
    let items: BatchItem[] = [];

    this.operationQueue = previousOp.then(async () => {
      items = [...this.queue];
      this.queue = [];
      this.clientOrder = 0;

      const result = await this.persist();
      if (!result.success) {
        logger.error('Failed to persist empty queue after dequeue');
      }
    });

    await this.operationQueue;
    return items;
  }

  clear(): Promise<void> {
    const previousOp = this.operationQueue;
    this.operationQueue = previousOp.then(async () => {
      const result = await removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
      if (!result.success) {
        logger.error('Failed to clear queue from storage');
        return;
      }
      this.queue = [];
      this.clientOrder = 0;
    });
    return this.operationQueue;
  }

  getSize(): number {
    return this.queue.length;
  }

  private async persist() {
    return await setItem(STORAGE_KEYS.OFFLINE_QUEUE, this.queue);
  }
}
