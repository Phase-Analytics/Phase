import { eq } from 'drizzle-orm';
import { db, linkDomains, links } from '@/db';
import { deleteR2Prefix, isR2Configured } from '@/lib/r2';
import { invalidateCachedDomain, invalidateCachedLink } from './cache';
import { deleteLinkClickTotals } from './click-totals';
import { releaseProviderHostname } from './domains';

/**
 * External link resources outlive the Postgres cascade on app deletion:
 * Cloudflare hostnames, R2 OG images and Redis configs. Snapshot them before
 * the delete, release them after it.
 */
export type AppLinkResources = {
  appId: string;
  links: { id: string; slug: string; domainId: string | null }[];
  domains: Pick<
    typeof linkDomains.$inferSelect,
    'id' | 'hostname' | 'providerId' | 'legacyVerified'
  >[];
};

export async function collectAppLinkResources(
  appId: string
): Promise<AppLinkResources> {
  const [linkRows, domainRows] = await Promise.all([
    db
      .select({ id: links.id, slug: links.slug, domainId: links.domainId })
      .from(links)
      .where(eq(links.appId, appId)),
    db
      .select({
        id: linkDomains.id,
        hostname: linkDomains.hostname,
        providerId: linkDomains.providerId,
        legacyVerified: linkDomains.legacyVerified,
      })
      .from(linkDomains)
      .where(eq(linkDomains.appId, appId)),
  ]);
  return { appId, links: linkRows, domains: domainRows };
}

async function releaseResources(resources: AppLinkResources): Promise<void> {
  for (const domain of resources.domains) {
    await releaseProviderHostname(domain);
    await invalidateCachedDomain(domain.hostname);
  }

  await Promise.all(
    resources.links.map((link) =>
      invalidateCachedLink(link.slug, link.domainId)
    )
  );
  await deleteLinkClickTotals(resources.links.map((link) => link.id));

  if (isR2Configured()) {
    try {
      await deleteR2Prefix(`links/${resources.appId}/`);
    } catch (error) {
      console.error(
        `[Links] Failed to delete OG images for app ${resources.appId}:`,
        error
      );
    }
  }
}

/** Best-effort and off the response path; every failure is logged. */
export function releaseAppLinkResources(resources: AppLinkResources): void {
  releaseResources(resources).catch((error) => {
    console.error(
      `[Links] Cleanup after deleting app ${resources.appId} failed:`,
      error
    );
  });
}
