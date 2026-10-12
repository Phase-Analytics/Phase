import { LocalTtlCache } from './local-cache';
import {
  createLinksRedisClient,
  getLinksRedis,
  logLinkRedisFailure,
} from './redis';

/**
 * Two-tier cache for redirect configs: a short in-process TTL cache in front
 * of Redis, with Postgres as the source of truth. Unknown slugs/hosts are
 * cached as a "missing" sentinel so random-slug floods do not reach Postgres.
 * Redis failures always degrade to a miss (fail-open to Postgres).
 */
const LINK_CACHE_PREFIX = 'link:cfg:v3:';
const POSITIVE_TTL_SECONDS = 300;
const NEGATIVE_TTL_SECONDS = 60;
const LOCAL_TTL_MS = 15_000;
const LOCAL_MAX_ENTRIES = 10_000;
const INVALIDATION_CHANNEL = 'link:cfg:invalidate';
const MISSING_SENTINEL = '{"missing":true}';

export type CachedLinkConfig = {
  id: string;
  appId: string;
  domainId: string | null;
  slug: string;
  name: string | null;
  destinationUrl: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  deviceIosUrl: string | null;
  deviceAndroidUrl: string | null;
  deviceOthersUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  expiresAt: string | null;
  disabledAt: string | null;
  banned: boolean;
};

/** Only verified domains are cached as present; anything else is "missing". */
export type CachedDomainConfig = {
  id: string;
  appId: string;
  hostname: string;
};

export type CacheLookup<T> = { hit: true; value: T | null } | { hit: false };

const localCache = new LocalTtlCache<unknown>({
  ttlMs: LOCAL_TTL_MS,
  maxEntries: LOCAL_MAX_ENTRIES,
});

let subscriberStarted = false;

/** Other replicas drop their in-process copies when a config changes. */
function ensureInvalidationSubscriber(): void {
  if (subscriberStarted) {
    return;
  }
  subscriberStarted = true;

  const subscriber = createLinksRedisClient('invalidation subscriber', {
    enableOfflineQueue: true,
    commandTimeout: undefined,
    maxRetriesPerRequest: null,
  });
  if (!subscriber) {
    return;
  }

  subscriber.on('message', (_channel: string, key: string) => {
    localCache.delete(key);
  });
  subscriber.subscribe(INVALIDATION_CHANNEL).catch((error) => {
    logLinkRedisFailure('invalidation subscribe', error);
  });
}

function linkKey(slug: string, domainId: string | null): string {
  const scope = domainId ? `domain:${domainId}` : 'default';
  return `${LINK_CACHE_PREFIX}${scope}:${slug}`;
}

function domainKey(hostname: string): string {
  return `${LINK_CACHE_PREFIX}host:${hostname.toLowerCase()}`;
}

async function readThrough<T>(key: string): Promise<CacheLookup<T>> {
  ensureInvalidationSubscriber();

  const local = localCache.get(key);
  if (local) {
    return { hit: true, value: local.value as T | null };
  }

  const redis = getLinksRedis();
  if (!redis) {
    return { hit: false };
  }

  let raw: string | null;
  try {
    raw = await redis.get(key);
  } catch (error) {
    logLinkRedisFailure('cache read', error);
    return { hit: false };
  }

  if (raw === null) {
    return { hit: false };
  }

  let value: T | null;
  try {
    value = raw === MISSING_SENTINEL ? null : (JSON.parse(raw) as T);
  } catch {
    return { hit: false };
  }

  localCache.set(key, value);
  return { hit: true, value };
}

function writeThrough<T>(key: string, value: T | null): void {
  localCache.set(key, value);

  const redis = getLinksRedis();
  if (!redis) {
    return;
  }

  const payload = value === null ? MISSING_SENTINEL : JSON.stringify(value);
  const ttl = value === null ? NEGATIVE_TTL_SECONDS : POSITIVE_TTL_SECONDS;
  redis.set(key, payload, 'EX', ttl).catch((error) => {
    logLinkRedisFailure('cache write', error);
  });
}

async function invalidate(key: string): Promise<void> {
  localCache.delete(key);

  const redis = getLinksRedis();
  if (!redis) {
    return;
  }

  try {
    await redis.multi().del(key).publish(INVALIDATION_CHANNEL, key).exec();
  } catch (error) {
    logLinkRedisFailure('cache invalidate', error);
  }
}

export function getCachedLink(
  slug: string,
  domainId: string | null
): Promise<CacheLookup<CachedLinkConfig>> {
  return readThrough<CachedLinkConfig>(linkKey(slug, domainId));
}

export function setCachedLink(
  slug: string,
  domainId: string | null,
  config: CachedLinkConfig | null
): void {
  writeThrough(linkKey(slug, domainId), config);
}

export function invalidateCachedLink(
  slug: string,
  domainId: string | null
): Promise<void> {
  return invalidate(linkKey(slug, domainId));
}

export function getCachedDomain(
  hostname: string
): Promise<CacheLookup<CachedDomainConfig>> {
  return readThrough<CachedDomainConfig>(domainKey(hostname));
}

export function setCachedDomain(
  hostname: string,
  config: CachedDomainConfig | null
): void {
  writeThrough(domainKey(hostname), config);
}

export function invalidateCachedDomain(hostname: string): Promise<void> {
  return invalidate(domainKey(hostname));
}
