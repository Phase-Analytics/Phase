import { getRedis } from '@/lib/rate-limit';

const LINK_CACHE_PREFIX = 'link:cfg:v2:';
const LINK_CACHE_TTL_SECONDS = 300;

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
};

export type CachedDomainConfig = {
  id: string;
  appId: string;
  hostname: string;
  status: string;
};

function linkKey(slug: string, domainId: string | null) {
  const scope = domainId ? `domain:${domainId}` : 'default';
  return `${LINK_CACHE_PREFIX}${scope}:${slug}`;
}

function domainKey(hostname: string) {
  return `${LINK_CACHE_PREFIX}host:${hostname.toLowerCase()}`;
}

export async function getCachedLink(
  slug: string,
  domainId: string | null
): Promise<CachedLinkConfig | null> {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  const raw = await redis.get(linkKey(slug, domainId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CachedLinkConfig;
  } catch {
    return null;
  }
}

export async function setCachedLink(
  slug: string,
  domainId: string | null,
  config: CachedLinkConfig
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  await redis.set(
    linkKey(slug, domainId),
    JSON.stringify(config),
    'EX',
    LINK_CACHE_TTL_SECONDS
  );
}

export async function invalidateCachedLink(
  slug: string,
  domainId: string | null
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  await redis.del(linkKey(slug, domainId));
}

export async function getCachedDomain(
  hostname: string
): Promise<CachedDomainConfig | null> {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  const raw = await redis.get(domainKey(hostname));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CachedDomainConfig;
    if (parsed.status !== 'verified') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function setCachedDomain(
  hostname: string,
  config: CachedDomainConfig
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  await redis.set(
    domainKey(hostname),
    JSON.stringify(config),
    'EX',
    LINK_CACHE_TTL_SECONDS
  );
}

export async function invalidateCachedDomain(hostname: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  await redis.del(domainKey(hostname));
}
