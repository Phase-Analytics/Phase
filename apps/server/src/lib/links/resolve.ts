import { and, eq } from 'drizzle-orm';
import { db, linkDomainBindings, linkDomains, links } from '@/db';
import {
  type CachedDomainConfig,
  type CachedLinkConfig,
  getCachedDomain,
  getCachedLink,
  setCachedDomain,
  setCachedLink,
} from './cache';

async function loadDomainBindings(linkId: string): Promise<string[] | null> {
  const bindings = await db
    .select({ domainId: linkDomainBindings.domainId })
    .from(linkDomainBindings)
    .where(eq(linkDomainBindings.linkId, linkId));

  if (bindings.length === 0) {
    return null;
  }

  return bindings.map((row) => row.domainId);
}

export async function resolveLinkBySlug(
  slug: string
): Promise<CachedLinkConfig | null> {
  const cached = await getCachedLink(slug);
  if (cached) {
    return cached;
  }

  const row = await db.query.links.findFirst({
    where: eq(links.slug, slug),
  });

  if (!row) {
    return null;
  }

  const config: CachedLinkConfig = {
    id: row.id,
    appId: row.appId,
    slug: row.slug,
    destinationUrl: row.destinationUrl,
    utmSource: row.utmSource,
    utmMedium: row.utmMedium,
    utmCampaign: row.utmCampaign,
    utmTerm: row.utmTerm,
    utmContent: row.utmContent,
    deviceIosUrl: row.deviceIosUrl,
    deviceAndroidUrl: row.deviceAndroidUrl,
    deviceOthersUrl: row.deviceOthersUrl,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    disabledAt: row.disabledAt?.toISOString() ?? null,
    allowedDomainIds: await loadDomainBindings(row.id),
  };

  await setCachedLink(slug, config);
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

export function isLinkAllowedOnDomain(
  link: CachedLinkConfig,
  domain: CachedDomainConfig
): boolean {
  if (link.appId !== domain.appId) {
    return false;
  }

  if (!link.allowedDomainIds) {
    return true;
  }

  return link.allowedDomainIds.includes(domain.id);
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
