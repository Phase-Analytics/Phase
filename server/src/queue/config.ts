import type { ConnectionOptions } from 'bullmq';
import Redis from 'ioredis';

let redisConnection: Redis | null = null;

export const getRedisConnection = (): ConnectionOptions => {
  const url = process.env.UPSTASH_REDIS_URL;

  if (!url) {
    throw new Error('UPSTASH_REDIS_URL must be set in environment variables');
  }

  if (!redisConnection) {
    redisConnection = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false,
    });

    redisConnection.on('error', (error) => {
      console.error('[Redis] Connection error:', error);
    });
  }

  return redisConnection as unknown as ConnectionOptions;
};

export const createRedisClient = (): Redis => {
  const url = process.env.UPSTASH_REDIS_URL;

  if (!url) {
    throw new Error('UPSTASH_REDIS_URL must be set in environment variables');
  }

  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  });
};

export const closeRedisConnection = async (): Promise<void> => {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
};

export const BATCH_CONFIG = {
  BATCH_SIZE: 50,
  BATCH_INTERVAL_MS: 3000,
  MAX_BUFFER_SIZE: 500,
} as const;

export const QUEUE_CONFIG = {
  QUEUE_NAME: 'api-events-batch',
  CONCURRENCY: 1,
  JOB_OPTIONS: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
    removeOnComplete: {
      age: 86_400,
      count: 100,
    },
    removeOnFail: {
      age: 604_800,
      count: 500,
    },
  },
} as const;
