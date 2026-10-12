import { createHash } from 'node:crypto';
import {
  checkRateLimit,
  type RateLimitConfig,
  type RateLimitResult,
} from '@/lib/rate-limit';

// One app's whole fleet shares the app-key budget, so it is sized for
// traffic spikes rather than for a single device.
const SDK_APP_KEY_LIMIT: RateLimitConfig = {
  maxAttempts: 60_000,
  ttl: 60,
  keyPrefix: 'rate:sdk-app',
};

// Backstop against a single source flooding with a leaked or bogus key.
// Kept high because carrier NAT puts many devices behind one address.
const SDK_IP_LIMIT: RateLimitConfig = {
  maxAttempts: 5000,
  ttl: 60,
  keyPrefix: 'rate:sdk-ip',
};

function extractBearerToken(request: Request): string | null {
  const [scheme, token] = (request.headers.get('authorization') ?? '').split(
    ' '
  );
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

export type SdkRateLimitOutcome = {
  result: RateLimitResult;
  limit: number;
};

/**
 * Rate limits SDK traffic per app key, with a per-IP backstop. The key is
 * hashed so app keys never appear in Redis.
 */
export async function checkSdkRateLimit(
  request: Request,
  ip: string | null
): Promise<SdkRateLimitOutcome | null> {
  const appKey = extractBearerToken(request);

  if (ip) {
    const result = await checkRateLimit(SDK_IP_LIMIT, { ip });
    if (!(result.allowed && appKey)) {
      return { result, limit: SDK_IP_LIMIT.maxAttempts };
    }
  }

  if (!appKey) {
    return null;
  }

  const appKeyHash = createHash('sha256')
    .update(appKey)
    .digest('hex')
    .slice(0, 32);
  const result = await checkRateLimit(SDK_APP_KEY_LIMIT, {
    deviceId: `app:${appKeyHash}`,
  });
  return { result, limit: SDK_APP_KEY_LIMIT.maxAttempts };
}
