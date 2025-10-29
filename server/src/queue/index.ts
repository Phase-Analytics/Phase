import { randomUUID } from 'node:crypto';
import { Queue } from 'bullmq';
import type Redis from 'ioredis';
import {
  BATCH_CONFIG,
  createRedisClient,
  getRedisConnection,
  QUEUE_CONFIG,
} from './config';

export type AnalyticsEventData = {
  eventId: string;
  sessionId: string;
  name: string;
  params?: Record<string, string | number | boolean | null>;
  timestamp: number;
};

export type BatchJobData = {
  events: AnalyticsEventData[];
  batchId: string;
};

const REDIS_EVENTS_KEY = 'analytics_events_buffer';
const REDIS_TIMER_KEY = 'analytics_events_timer';

const safeJsonParse = (jsonString: string): AnalyticsEventData | null => {
  try {
    const parsed = JSON.parse(jsonString);

    if (
      typeof parsed.eventId !== 'string' ||
      typeof parsed.sessionId !== 'string' ||
      typeof parsed.name !== 'string' ||
      typeof parsed.timestamp !== 'number'
    ) {
      console.error('[Queue] Invalid event data structure:', parsed);
      return null;
    }

    if (
      parsed.params !== undefined &&
      (typeof parsed.params !== 'object' || Array.isArray(parsed.params))
    ) {
      console.error('[Queue] Invalid params type:', parsed);
      return null;
    }

    return parsed as AnalyticsEventData;
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

class RedisAnalyticsEventsBuffer {
  private readonly redis = createRedisClient();
  private batchTimer: NodeJS.Timeout | null = null;

  async addEvent(event: AnalyticsEventData): Promise<void> {
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

      const events: AnalyticsEventData[] = [];
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

export const analyticsEventsBuffer = new RedisAnalyticsEventsBuffer();

export const analyticsEventsBatchQueue = new Queue<BatchJobData>(
  QUEUE_CONFIG.QUEUE_NAME,
  {
    connection: getRedisConnection(),
    defaultJobOptions: QUEUE_CONFIG.JOB_OPTIONS,
  }
);

export const isQueueHealthy = async (): Promise<boolean> => {
  try {
    const client = await analyticsEventsBatchQueue.client;
    await client.ping();
    return true;
  } catch {
    return false;
  }
};

export const addAnalyticsEvent = async (
  event: AnalyticsEventData
): Promise<void> => {
  await analyticsEventsBuffer.addEvent(event);
};

const enqueueBatchJob = async (
  events: AnalyticsEventData[]
): Promise<string> => {
  const batchId = `batch_${randomUUID()}`;

  const job = await analyticsEventsBatchQueue.add('process-batch', {
    events,
    batchId,
  });

  return job.id ?? batchId;
};

export const getQueueMetrics = async () => {
  const [waiting, active, completed, failed, delayed, bufferSize] =
    await Promise.all([
      analyticsEventsBatchQueue.getWaitingCount(),
      analyticsEventsBatchQueue.getActiveCount(),
      analyticsEventsBatchQueue.getCompletedCount(),
      analyticsEventsBatchQueue.getFailedCount(),
      analyticsEventsBatchQueue.getDelayedCount(),
      analyticsEventsBuffer.getBufferSize(),
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
  analyticsEventsBuffer.stop();
  analyticsEventsBuffer.flush();
  await analyticsEventsBatchQueue.close();
};
