import { randomUUID } from 'node:crypto';
import { Queue } from 'bullmq';
import type Redis from 'ioredis';
import {
  BATCH_CONFIG,
  createRedisClient,
  getRedisConnection,
  QUEUE_CONFIG,
} from './config';

export type ApiEventData = {
  route: string;
  status: number;
  processingTimeMs: number;
  errorFlag: boolean;
  timestamp: number;
  version?: string;
  userId?: string;
  apikeyId?: string;
};

export type BatchJobData = {
  events: ApiEventData[];
  batchId: string;
};

const REDIS_EVENTS_KEY = 'api_events_buffer';
const REDIS_TIMER_KEY = 'api_events_timer';

const safeJsonParse = (jsonString: string): ApiEventData | null => {
  try {
    const parsed = JSON.parse(jsonString);

    if (
      typeof parsed.route !== 'string' ||
      typeof parsed.status !== 'number' ||
      typeof parsed.processingTimeMs !== 'number' ||
      typeof parsed.errorFlag !== 'boolean' ||
      typeof parsed.timestamp !== 'number'
    ) {
      console.error('[Queue] Invalid event data structure:', parsed);
      return null;
    }

    // Validate userId and apikeyId if present (backward compatibility)
    if (
      (parsed.userId !== undefined && typeof parsed.userId !== 'string') ||
      (parsed.apikeyId !== undefined && typeof parsed.apikeyId !== 'string')
    ) {
      console.error('[Queue] Invalid userId or apikeyId type:', parsed);
      return null;
    }

    return parsed as ApiEventData;
  } catch (error) {
    console.error('[Queue] JSON parse error:', error);
    return null;
  }
};

const popEventsFromBuffer = async (
  redis: Redis,
  maxCount: number
): Promise<string[]> => {
  const events: string[] = [];

  for (let i = 0; i < maxCount; i++) {
    const event = await redis.lpop(REDIS_EVENTS_KEY);
    if (!event) {
      break;
    }
    events.push(event);
  }

  return events;
};

class RedisApiEventsBuffer {
  private readonly redis = createRedisClient();
  private batchTimer: NodeJS.Timeout | null = null;

  async addEvent(event: ApiEventData): Promise<void> {
    const timerExists = await this.redis.exists(REDIS_TIMER_KEY);
    if (timerExists) {
      await this.redis.lpush(REDIS_EVENTS_KEY, JSON.stringify(event));
      return;
    }

    await this.redis.lpush(REDIS_EVENTS_KEY, JSON.stringify(event));

    const bufferSize = await this.redis.llen(REDIS_EVENTS_KEY);

    if (bufferSize > BATCH_CONFIG.MAX_BUFFER_SIZE) {
      await this.redis.ltrim(
        REDIS_EVENTS_KEY,
        0,
        BATCH_CONFIG.MAX_BUFFER_SIZE - 1
      );
    }

    if (bufferSize >= BATCH_CONFIG.BATCH_SIZE || bufferSize === 1) {
      await this.processBatch();
    }
  }

  private async processBatch(): Promise<void> {
    try {
      const eventStrings = await popEventsFromBuffer(
        this.redis,
        BATCH_CONFIG.BATCH_SIZE
      );

      if (eventStrings.length === 0) {
        return;
      }

      const events: ApiEventData[] = [];
      for (const eventString of eventStrings) {
        const event = safeJsonParse(eventString);
        if (event) {
          events.push(event);
        }
      }

      if (events.length === 0) {
        console.warn('[Queue] No valid events found in batch');
        return;
      }

      await enqueueBatchJob(events);

      await this.redis.setex(
        REDIS_TIMER_KEY,
        Math.ceil(BATCH_CONFIG.BATCH_INTERVAL_MS / 1000),
        '1'
      );

      this.batchTimer = setTimeout(async () => {
        try {
          await this.redis.del(REDIS_TIMER_KEY);
        } catch (error) {
          console.error('[Queue] Timer cleanup error:', error);
        }
        this.batchTimer = null;
      }, BATCH_CONFIG.BATCH_INTERVAL_MS);
    } catch (error) {
      console.error('[Queue] Batch processing error:', error);
      await this.redis.del(REDIS_TIMER_KEY);
    }
  }

  async getBufferSize(): Promise<number> {
    return await this.redis.llen(REDIS_EVENTS_KEY);
  }

  async flush(): Promise<void> {
    await this.processBatch();
  }

  async stop(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    await this.redis.del(REDIS_TIMER_KEY);
  }
}

export const apiEventsBuffer = new RedisApiEventsBuffer();

export const apiEventsBatchQueue = new Queue<BatchJobData>(
  QUEUE_CONFIG.QUEUE_NAME,
  {
    connection: getRedisConnection(),
    defaultJobOptions: QUEUE_CONFIG.JOB_OPTIONS,
  }
);

export const isQueueHealthy = async (): Promise<boolean> => {
  try {
    const client = await apiEventsBatchQueue.client;
    await client.ping();
    return true;
  } catch {
    return false;
  }
};

export const addApiEvent = async (event: ApiEventData): Promise<void> => {
  await apiEventsBuffer.addEvent(event);
};

const enqueueBatchJob = async (events: ApiEventData[]): Promise<string> => {
  const batchId = `batch_${randomUUID()}`;

  const job = await apiEventsBatchQueue.add('process-batch', {
    events,
    batchId,
  });

  return job.id ?? batchId;
};

export const getQueueMetrics = async () => {
  const [waiting, active, completed, failed, delayed, bufferSize] =
    await Promise.all([
      apiEventsBatchQueue.getWaitingCount(),
      apiEventsBatchQueue.getActiveCount(),
      apiEventsBatchQueue.getCompletedCount(),
      apiEventsBatchQueue.getFailedCount(),
      apiEventsBatchQueue.getDelayedCount(),
      apiEventsBuffer.getBufferSize(),
    ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
    bufferSize,
  };
};

export const flushAndClose = async (): Promise<void> => {
  apiEventsBuffer.stop();
  apiEventsBuffer.flush();
  await apiEventsBatchQueue.close();
};
