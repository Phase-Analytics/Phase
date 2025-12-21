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
  deviceId?: string;
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
  WAITLIST: {
    maxAttempts: 3,
    ttl: 86_400,
    keyPrefix: 'rate:waitlist',
  } satisfies RateLimitConfig,
  SDK_API: {
    maxAttempts: 1000,
    ttl: 60,
    keyPrefix: 'rate:sdk',
  } satisfies RateLimitConfig,
} as const;

const RATE_LIMIT_LUA_SCRIPT = `
  local key = KEYS[1]
  local max_attempts = tonumber(ARGV[1])
  local ttl = tonumber(ARGV[2])

  local current = redis.call('INCR', key)

  if current == 1 then
    redis.call('EXPIRE', key, ttl)
  end

  local remaining_ttl = redis.call('TTL', key)
  local remaining = math.max(0, max_attempts - current)
  local allowed = current <= max_attempts

  return {current, remaining, remaining_ttl, allowed and 1 or 0}
`;

export async function checkRateLimit(
  config: RateLimitConfig,
  identifiers: RateLimitIdentifier
): Promise<RateLimitResult> {
  const redisClient = getRedis();

  if (!redisClient) {
    return { allowed: true };
  }

  const { email, ip, deviceId } = identifiers;

  if (!(email || ip || deviceId)) {
    throw new Error(
      '[RateLimit] At least one identifier (email, ip, or deviceId) is required'
    );
  }

  try {
    const identifierChecks = [
      email ? { type: 'email', value: email } : null,
      ip ? { type: 'ip', value: ip } : null,
      deviceId ? { type: 'device', value: deviceId } : null,
    ].filter(Boolean) as Array<{ type: string; value: string }>;

    let minRemaining = config.maxAttempts;
    let maxResetAt: number | undefined;

    for (const identifier of identifierChecks) {
      const key = `${config.keyPrefix}:${identifier.type}:${identifier.value}`;

      const result = (await redisClient.eval(
        RATE_LIMIT_LUA_SCRIPT,
        1,
        key,
        config.maxAttempts.toString(),
        config.ttl.toString()
      )) as [number, number, number, number];

      const [_current, remaining, remainingTtl, allowed] = result;

      if (allowed === 0) {
        return {
          allowed: false,
          reason: 'Too many requests',
          remaining: 0,
          resetAt:
            remainingTtl > 0 ? Date.now() + remainingTtl * 1000 : undefined,
        };
      }

      minRemaining = Math.min(minRemaining, remaining);
      if (remainingTtl > 0) {
        const resetAt = Date.now() + remainingTtl * 1000;
        maxResetAt = maxResetAt ? Math.max(maxResetAt, resetAt) : resetAt;
      }
    }

    return {
      allowed: true,
      remaining: Math.max(0, minRemaining),
      resetAt: maxResetAt,
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

export async function checkWaitlistRateLimit(
  ip: string
): Promise<RateLimitResult> {
  return await checkRateLimit(RATE_LIMIT_STRATEGIES.WAITLIST, { ip });
}

export async function checkSdkApiRateLimit(
  deviceId: string,
  ip?: string
): Promise<RateLimitResult> {
  return await checkRateLimit(RATE_LIMIT_STRATEGIES.SDK_API, {
    deviceId,
    ip,
  });
}

export function createRateLimiter(config: RateLimitConfig) {
  return (identifiers: RateLimitIdentifier) =>
    checkRateLimit(config, identifiers);
}
