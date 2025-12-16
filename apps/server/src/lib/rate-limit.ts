import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: false,
      enableOfflineQueue: true,
    });

    redis.on('error', (error) => {
      console.error('[Redis] Connection error:', error);
    });
  }

  return redis;
}

export type RateLimitConfig = {
  maxAttempts: number;
  ttl: number;
  keyPrefix: string;
};

export type RateLimitIdentifier = {
  email?: string;
  ip?: string;
};

export type RateLimitResult = {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  resetAt?: number;
};

export const RATE_LIMIT_STRATEGIES = {
  PASSWORD_EMAIL: {
    maxAttempts: 3,
    ttl: 3600,
    keyPrefix: 'rate:reset',
  } satisfies RateLimitConfig,
  WEB_API: {
    maxAttempts: 100,
    ttl: 30,
    keyPrefix: 'rate:web',
  } satisfies RateLimitConfig,
} as const;

export async function checkRateLimit(
  config: RateLimitConfig,
  identifiers: RateLimitIdentifier
): Promise<RateLimitResult> {
  const redisClient = getRedis();

  if (!redisClient) {
    return { allowed: true };
  }

  const { email, ip } = identifiers;

  if (!(email || ip)) {
    throw new Error(
      '[RateLimit] At least one identifier (email or ip) is required'
    );
  }

  try {
    if (email) {
      const emailKey = `${config.keyPrefix}:email:${email}`;
      const emailCount = await redisClient.incr(emailKey);

      if (emailCount === 1) {
        await redisClient.expire(emailKey, config.ttl);
      }

      if (emailCount > config.maxAttempts) {
        const ttl = await redisClient.ttl(emailKey);
        return {
          allowed: false,
          reason: 'Too many requests',
          remaining: 0,
          resetAt: ttl > 0 ? Date.now() + ttl * 1000 : undefined,
        };
      }
    }

    if (ip) {
      const ipKey = `${config.keyPrefix}:ip:${ip}`;
      const ipCount = await redisClient.incr(ipKey);

      if (ipCount === 1) {
        await redisClient.expire(ipKey, config.ttl);
      }

      if (ipCount > config.maxAttempts) {
        const ttl = await redisClient.ttl(ipKey);
        return {
          allowed: false,
          reason: 'Too many requests',
          remaining: 0,
          resetAt: ttl > 0 ? Date.now() + ttl * 1000 : undefined,
        };
      }
    }

    let remaining = config.maxAttempts;
    if (email) {
      const emailKey = `${config.keyPrefix}:email:${email}`;
      const emailCount = await redisClient.get(emailKey);
      remaining = Math.min(
        remaining,
        config.maxAttempts - (emailCount ? Number.parseInt(emailCount, 10) : 0)
      );
    }
    if (ip) {
      const ipKey = `${config.keyPrefix}:ip:${ip}`;
      const ipCount = await redisClient.get(ipKey);
      remaining = Math.min(
        remaining,
        config.maxAttempts - (ipCount ? Number.parseInt(ipCount, 10) : 0)
      );
    }

    return {
      allowed: true,
      remaining: Math.max(0, remaining),
    };
  } catch (error) {
    console.error('[RateLimit] Error checking rate limit:', error);
    return { allowed: true };
  }
}

export async function checkPasswordResetRateLimit(
  email: string,
  ip?: string
): Promise<RateLimitResult> {
  return await checkRateLimit(RATE_LIMIT_STRATEGIES.PASSWORD_EMAIL, {
    email,
    ip,
  });
}

export async function checkWebApiRateLimit(
  ip: string
): Promise<RateLimitResult> {
  return await checkRateLimit(RATE_LIMIT_STRATEGIES.WEB_API, { ip });
}

export function createRateLimiter(config: RateLimitConfig) {
  return (identifiers: RateLimitIdentifier) =>
    checkRateLimit(config, identifiers);
}
