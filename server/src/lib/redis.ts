import Redis from 'ioredis';

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL is not set');
}

export const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  connectTimeout: 10_000,
  lazyConnect: false,
});

redis.on('error', (error) => {
  console.error('[Redis] Error:', error);
});

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

redis.on('ready', () => {
  console.log('[Redis] Ready');
});

export const STREAM_KEYS = {
  EVENTS: 'stream:events',
  PINGS: 'stream:pings',
} as const;

export const CONSUMER_GROUP = 'batch-processor';
export const CONSUMER_NAME =
  process.env.CONSUMER_NAME || `worker-${process.pid}`;
