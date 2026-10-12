import { createHash } from 'node:crypto';
import { getRedis } from '@/lib/rate-limit';

const KEY_PREFIX = 'phase:read:v1';

export const READ_CACHE_TTL = {
  short: 30,
  standard: 60,
} as const;

type CachedReadSpec = {
  /** Authorized app the result belongs to; scopes every key to one app. */
  appId: string;
  /** Stable endpoint identifier, e.g. `sessions:timeseries`. */
  scope: string;
  /** Every input that changes the result (dates, tz, metric, limit...). */
  params: Record<string, unknown>;
  ttlSeconds: number;
};

const inFlight = new Map<string, Promise<unknown>>();

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

export function buildReadCacheKey(spec: Omit<CachedReadSpec, 'ttlSeconds'>) {
  const digest = createHash('sha256')
    .update(stableStringify(spec.params))
    .digest('hex')
    .slice(0, 32);
  return `${KEY_PREFIX}:app:${spec.appId}:${spec.scope}:${digest}`;
}

function readyRedis() {
  const redis = getRedis();
  return redis?.status === 'ready' ? redis : null;
}

async function readCached<T>(key: string): Promise<{ value: T } | null> {
  const redis = readyRedis();
  if (!redis) {
    return null;
  }
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as { value: T }) : null;
  } catch (error) {
    console.error('[ReadCache] Read failed, loading from source:', error);
    return null;
  }
}

function writeCached(key: string, value: unknown, ttlSeconds: number): void {
  const redis = readyRedis();
  if (!redis) {
    return;
  }
  redis
    .set(key, JSON.stringify({ value }), 'EX', ttlSeconds)
    .catch((error: unknown) => {
      console.error('[ReadCache] Write failed:', error);
    });
}

/**
 * Read-through cache for app-scoped report reads. Callers must authorize
 * `appId` before calling. Concurrent identical requests in this process share
 * one load. Redis being unavailable only disables caching; load errors always
 * propagate and are never cached.
 */
export function cachedRead<T>(
  spec: CachedReadSpec,
  load: () => Promise<T>
): Promise<T> {
  const key = buildReadCacheKey(spec);
  const pending = inFlight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = (async () => {
    const cached = await readCached<T>(key);
    if (cached) {
      return cached.value;
    }
    const value = await load();
    writeCached(key, value, spec.ttlSeconds);
    return value;
  })().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, promise);
  return promise;
}
