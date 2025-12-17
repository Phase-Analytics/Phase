import type { HttpClient } from '../client/http-client';
import type { BatchItem, BatchRequest } from '../types';
import { VALIDATION } from '../types';
import { logger } from '../utils/logger';
import type { OfflineQueue } from './offline-queue';

const MAX_RETRY_COUNT = 5;

export class BatchSender {
  private readonly httpClient: HttpClient;
  private readonly offlineQueue: OfflineQueue;
  private isFlushing = false;

  constructor(httpClient: HttpClient, offlineQueue: OfflineQueue) {
    this.httpClient = httpClient;
    this.offlineQueue = offlineQueue;
  }

  async flush(): Promise<void> {
    if (this.isFlushing) {
      logger.debug('Flush already in progress, skipping');
      return;
    }

    this.isFlushing = true;

    try {
      const items = await this.offlineQueue.dequeueAll();

      if (items.length === 0) {
        return;
      }

      const batches = this.splitIntoBatches(items);

      for (const batch of batches) {
        try {
          const success = await this.sendBatch(batch);
          if (!success) {
            logger.error('Failed to send batch, re-queueing');
            await this.requeue(batch);
          }
        } catch {
          logger.error('Exception during batch send, re-queueing batch');
          await this.requeue(batch);
        }
      }
    } finally {
      this.isFlushing = false;
    }
  }

  private async requeue(items: BatchItem[]): Promise<void> {
    const requeuePromises = items.map(async (item) => {
      const retryCount = (item.retryCount ?? 0) + 1;

      if (retryCount > MAX_RETRY_COUNT) {
        logger.error('Item exceeded max retry count, dropping', {
          type: item.type,
          clientOrder: item.clientOrder,
          retryCount,
        });
        return;
      }

      try {
        await this.offlineQueue.enqueue({ ...item, retryCount });
      } catch {
        logger.error('Failed to re-enqueue item');
      }
    });

    await Promise.all(requeuePromises);
  }

  private async sendBatch(items: BatchItem[]): Promise<boolean> {
    const request: BatchRequest = { items };
    const result = await this.httpClient.sendBatch(request);

    if (!result.success) {
      logger.error('Batch request failed');
      return false;
    }

    const response = result.data;
    if (response.failed && response.failed > 0) {
      logger.error(
        `Batch partially failed: ${response.failed}/${(response.processed ?? 0) + response.failed}`
      );

      if (Array.isArray(response.errors)) {
        const failedItems: BatchItem[] = [];

        for (const error of response.errors) {
          if (error.clientOrder === undefined) {
            logger.error('Error missing clientOrder, cannot re-enqueue');
            continue;
          }
          const failedItem = items.find(
            (item) => item.clientOrder === error.clientOrder
          );
          if (failedItem) {
            failedItems.push(failedItem);
          }
        }

        if (failedItems.length > 0) {
          await this.requeue(failedItems);
        }
      }
    }

    return true;
  }

  private splitIntoBatches(items: BatchItem[]): BatchItem[][] {
    const batches: BatchItem[][] = [];
    const maxSize = VALIDATION.BATCH.MAX_SIZE;

    for (let i = 0; i < items.length; i += maxSize) {
      batches.push(items.slice(i, i + maxSize));
    }

    return batches;
  }
}
