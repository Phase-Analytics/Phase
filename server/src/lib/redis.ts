import Redis from 'ioredis';

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL is not set');
}

export const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  connectTimeout: 10_000,
  lazyConnect: false,
  retryStrategy: (times) => {
    if (times > 10) {
      console.error('[Redis] Max retries exceeded, giving up');
      return null;
    }
    const delay = Math.min(times * 100, 3000);
    console.log(`[Redis] Retrying connection in ${delay}ms (attempt ${times})`);
    return delay;
  },
  reconnectOnError: (error) => {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
    if (
      targetErrors.some((targetError) => error.message.includes(targetError))
    ) {
      return true;
    }
    return false;
  },
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
