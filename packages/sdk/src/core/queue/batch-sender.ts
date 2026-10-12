import type { HttpClient } from '../client/http-client';
import type { BatchError, BatchItem, BatchResponse } from '../types';
import { logger } from '../utils/logger';
import type { OfflineQueue } from './offline-queue';

// The server rejects whole batches from devices younger than 5 minutes that
// carry 100+ events, so keep requests well under that.
const MAX_ITEMS_PER_REQUEST = 50;
const MAX_ITEM_RETRIES = 5;
const FLUSH_DEADLINE_MS = 30_000;

export type FlushOutcome =
  | { status: 'idle' }
  | { status: 'sent' }
  /** Something is still queued that the server asked us to retry. */
  | { status: 'retry'; retryAfterMs: number | null };

type ChunkOutcome = { blocked: boolean; retained: number };

function toWireItem(item: BatchItem): BatchItem {
  const { retryCount: _retryCount, ...wire } = item;
  return wire as BatchItem;
}

/**
 * Sends the queue to `/sdk/batch`, one flush at a time. Items leave the queue
 * only when the server acknowledged them or marked them non-retryable.
 */
export class BatchSender {
  private readonly httpClient: HttpClient;
  private readonly queue: OfflineQueue;
  private inFlight: Promise<FlushOutcome> | null = null;
  private followUp: Promise<FlushOutcome> | null = null;

  constructor(httpClient: HttpClient, queue: OfflineQueue) {
    this.httpClient = httpClient;
    this.queue = queue;
  }

  /**
   * Starts a flush, or if one is running, schedules exactly one follow-up so
   * items enqueued meanwhile are covered. Never rejects.
   */
  flush(): Promise<FlushOutcome> {
    if (!this.inFlight) {
      return this.start();
    }
    if (!this.followUp) {
      this.followUp = this.inFlight.then(() => {
        this.followUp = null;
        return this.start();
      });
    }
    return this.followUp;
  }

  private start(): Promise<FlushOutcome> {
    const run = this.run().finally(() => {
      this.inFlight = null;
    });
    this.inFlight = run;
    return run;
  }

  private async run(): Promise<FlushOutcome> {
    const snapshot = this.queue.snapshot();
    if (snapshot.length === 0) {
      return { status: 'idle' };
    }

    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), FLUSH_DEADLINE_MS);
    let retained = 0;

    try {
      for (let i = 0; i < snapshot.length; i += MAX_ITEMS_PER_REQUEST) {
        if (controller.signal.aborted) {
          return { status: 'retry', retryAfterMs: null };
        }

        const chunk = snapshot.slice(i, i + MAX_ITEMS_PER_REQUEST);
        const result = await this.httpClient.sendBatch(
          chunk.map(toWireItem),
          controller.signal
        );

        if (result.kind === 'retry') {
          logger.warn('Batch send failed. Items stay queued for retry.', {
            error: result.error.message,
            queued: this.queue.getSize(),
          });
          return { status: 'retry', retryAfterMs: result.retryAfterMs };
        }

        if (result.kind === 'rejected') {
          logger.error(
            `Server rejected a batch (HTTP ${result.status}). Dropping ${chunk.length} item(s).`,
            result.error
          );
          this.queue.remove(new Set(chunk));
          continue;
        }

        const outcome = this.acknowledge(chunk, result.response);
        retained += outcome.retained;
        if (outcome.blocked) {
          // Later chunks may depend on a device/session that still needs retrying.
          break;
        }
      }

      return retained > 0
        ? { status: 'retry', retryAfterMs: null }
        : { status: 'sent' };
    } catch (error) {
      logger.error('Unexpected flush error. Items stay queued.', error);
      return { status: 'retry', retryAfterMs: null };
    } finally {
      clearTimeout(deadline);
      await this.queue.persistNow();
    }
  }

  private acknowledge(chunk: BatchItem[], response: BatchResponse): ChunkOutcome {
    const byOrder = new Map(chunk.map((item) => [item.clientOrder, item]));
    const failed = new Map<BatchItem, BatchError>();
    for (const error of response.errors ?? []) {
      const item = byOrder.get(error.clientOrder);
      if (item) {
        failed.set(item, error);
      }
    }

    const retained = this.selectRetained(failed);
    const toRemove = new Set<BatchItem>();
    const droppedCodes: string[] = [];
    let blocked = false;

    for (const item of chunk) {
      if (!retained.has(item)) {
        const error = failed.get(item);
        if (error) {
          droppedCodes.push(error.code);
        }
        toRemove.add(item);
        continue;
      }

      item.retryCount = (item.retryCount ?? 0) + 1;
      if (item.retryCount > MAX_ITEM_RETRIES) {
        logger.warn(
          `Dropping ${item.type} item after ${MAX_ITEM_RETRIES} failed retries.`,
          { code: failed.get(item)?.code }
        );
        toRemove.add(item);
      } else if (item.type === 'device' || item.type === 'session') {
        blocked = true;
      }
    }

    if (droppedCodes.length > 0) {
      logger.warn(
        `Server rejected ${droppedCodes.length} item(s) as non-retryable. Dropping them.`,
        { codes: [...new Set(droppedCodes)] }
      );
    }

    this.queue.remove(toRemove);
    return { blocked, retained: chunk.length - toRemove.size };
  }

  /**
   * Retryable failures stay queued, and so do failed items whose device or
   * session is being retried: they failed only because their parent did.
   */
  private selectRetained(failed: Map<BatchItem, BatchError>): Set<BatchItem> {
    const retained = new Set<BatchItem>();
    const retainedSessions = new Set<string>();
    let deviceRetained = false;

    for (const [item, error] of failed) {
      if (error.retryable === true) {
        retained.add(item);
        if (item.type === 'device') {
          deviceRetained = true;
        } else if (item.type === 'session') {
          retainedSessions.add(item.payload.sessionId);
        }
      }
    }

    for (const item of failed.keys()) {
      if (
        deviceRetained ||
        (item.type !== 'device' && retainedSessions.has(item.payload.sessionId))
      ) {
        retained.add(item);
      }
    }

    return retained;
  }
}
