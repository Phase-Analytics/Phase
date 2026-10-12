import { and, eq } from 'drizzle-orm';
import { db, linkDomains, links, policies } from '@/db';
import { buildDefaultShortUrl, resolvePrimaryShortUrl } from './urls';

export type LinkRow = typeof links.$inferSelect;
export type DomainLookup = Map<string, { hostname: string; status: string }>;

export async function loadDomainsByIdForApp(
  appId: string
): Promise<DomainLookup> {
  const rows = await db.query.linkDomains.findMany({
    where: eq(linkDomains.appId, appId),
    columns: { id: true, hostname: true, status: true },
  });
  return new Map(
    rows.map((row) => [row.id, { hostname: row.hostname, status: row.status }])
  );
}

export function findAppLink(appId: string, linkId: string) {
  return db.query.links.findFirst({
    where: and(eq(links.id, linkId), eq(links.appId, appId)),
  });
}

export async function getPolicyIdForLink(
  linkId: string
): Promise<string | null> {
  const row = await db.query.policies.findFirst({
    where: eq(policies.linkId, linkId),
    columns: { id: true },
  });
  return row?.id ?? null;
}

export function serializeLinkListItem(
  row: LinkRow,
  options?: { shortUrl?: string; totalClicks?: number }
) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    destinationUrl: row.destinationUrl,
    shortUrl: options?.shortUrl ?? buildDefaultShortUrl(row.slug),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    disabledAt: row.disabledAt?.toISOString() ?? null,
    banned: row.banned,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(options?.totalClicks === undefined
      ? {}
      : { totalClicks: options.totalClicks }),
  };
}

export function serializeLinkDetail(
  row: LinkRow,
  domainsById: DomainLookup,
  policyId: string | null
) {
  const shortUrl = resolvePrimaryShortUrl(row.slug, row.domainId, domainsById);

  return {
    ...serializeLinkListItem(row, { shortUrl }),
    appId: row.appId,
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
    domainId: row.domainId,
    destinationLocked: Boolean(policyId),
    policyId,
  };
}

/** Detail payload with fresh domain + policy lookups. */
export async function buildLinkDetail(row: LinkRow) {
  const [domainsById, policyId] = await Promise.all([
    loadDomainsByIdForApp(row.appId),
    getPolicyIdForLink(row.id),
  ]);
  return serializeLinkDetail(row, domainsById, policyId);
}
