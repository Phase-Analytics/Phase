import { getRedis } from '@/lib/rate-limit';

const LINK_CACHE_PREFIX = 'link:cfg:';
const LINK_CACHE_TTL_SECONDS = 300;

export type CachedLinkConfig = {
  id: string;
  appId: string;
  slug: string;
  destinationUrl: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  deviceIosUrl: string | null;
  deviceAndroidUrl: string | null;
  deviceOthersUrl: string | null;
  expiresAt: string | null;
  disabledAt: string | null;
  allowedDomainIds: string[] | null;
};

export type CachedDomainConfig = {
  id: string;
  appId: string;
  hostname: string;
  status: string;
};

function linkKey(slug: string) {
  return `${LINK_CACHE_PREFIX}slug:${slug}`;
}

function domainKey(hostname: string) {
  return `${LINK_CACHE_PREFIX}host:${hostname.toLowerCase()}`;
}

export async function getCachedLink(
  slug: string
): Promise<CachedLinkConfig | null> {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  const raw = await redis.get(linkKey(slug));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CachedLinkConfig;
    if (parsed.allowedDomainIds?.length === 0) {
      parsed.allowedDomainIds = null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function setCachedLink(
  slug: string,
  config: CachedLinkConfig
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  await redis.set(
    linkKey(slug),
    JSON.stringify(config),
    'EX',
    LINK_CACHE_TTL_SECONDS
  );
}

export async function invalidateCachedLink(slug: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  await redis.del(linkKey(slug));
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
