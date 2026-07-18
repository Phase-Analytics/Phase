import { and, eq, isNull } from 'drizzle-orm';
import { db, linkDomains, links } from '@/db';
import {
  type CachedDomainConfig,
  type CachedLinkConfig,
  getCachedDomain,
  getCachedLink,
  setCachedDomain,
  setCachedLink,
} from './cache';

export async function resolveLinkBySlug(
  slug: string,
  domainId: string | null
): Promise<CachedLinkConfig | null> {
  const cached = await getCachedLink(slug, domainId);
  if (cached) {
    return cached;
  }

  const row = await db.query.links.findFirst({
    where: and(
      eq(links.slug, slug),
      domainId ? eq(links.domainId, domainId) : isNull(links.domainId)
    ),
  });

  if (!row) {
    return null;
  }

  const config: CachedLinkConfig = {
    id: row.id,
    appId: row.appId,
    domainId: row.domainId,
    slug: row.slug,
    name: row.name,
    destinationUrl: row.destinationUrl,
    utmSource: row.utmSource,
    utmMedium: row.utmMedium,
    utmCampaign: row.utmCampaign,
    utmTerm: row.utmTerm,
    utmContent: row.utmContent,
    deviceIosUrl: row.deviceIosUrl,
    deviceAndroidUrl: row.deviceAndroidUrl,
    deviceOthersUrl: row.deviceOthersUrl,
    ogTitle: row.ogTitle,
    ogDescription: row.ogDescription,
    ogImageUrl: row.ogImageUrl,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    disabledAt: row.disabledAt?.toISOString() ?? null,
  };

  await setCachedLink(slug, domainId, config);
  return config;
}

export async function resolveVerifiedDomain(
  hostname: string
): Promise<CachedDomainConfig | null> {
  const normalized = hostname.toLowerCase();
  const cached = await getCachedDomain(normalized);
  if (cached) {
    return cached.status === 'verified' ? cached : null;
  }

  const row = await db.query.linkDomains.findFirst({
    where: and(
      eq(linkDomains.hostname, normalized),
      eq(linkDomains.status, 'verified')
    ),
  });

  if (!row) {
    return null;
  }

  const config: CachedDomainConfig = {
    id: row.id,
    appId: row.appId,
    hostname: row.hostname,
    status: row.status,
  };

  await setCachedDomain(normalized, config);
  return config;
}

export function isLinkUnavailable(link: CachedLinkConfig): boolean {
  if (link.disabledAt) {
    return true;
  }

  if (link.expiresAt) {
    return new Date(link.expiresAt).getTime() <= Date.now();
  }

  return false;
}
