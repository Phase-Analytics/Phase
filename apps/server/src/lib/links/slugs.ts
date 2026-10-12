import { and, eq, gt, isNull, lt, ne, sql } from 'drizzle-orm';
import { db, links } from '@/db';
import { linkSlugTombstones } from '@/db/schema';

/**
 * Default-domain slugs are global. After a link is deleted (or moves off the
 * default domain) its slug is held for the owning app, so printed QR codes
 * and shared links cannot be re-pointed by someone else.
 */
const TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbExecutor = typeof db | DbTransaction;

function tombstoneCutoff(): Date {
  return new Date(Date.now() - TOMBSTONE_TTL_MS);
}

export async function isLinkSlugAvailable(options: {
  slug: string;
  domainId: string | null;
  appId: string;
  excludeLinkId?: string;
}): Promise<boolean> {
  const { slug, domainId, appId, excludeLinkId } = options;
  const existing = await db.query.links.findFirst({
    where: and(
      eq(links.slug, slug),
      domainId ? eq(links.domainId, domainId) : isNull(links.domainId)
    ),
    columns: { id: true },
  });
  if (existing && existing.id !== excludeLinkId) {
    return false;
  }
  if (domainId) {
    return true;
  }

  const [held] = await db
    .select({ slug: linkSlugTombstones.slug })
    .from(linkSlugTombstones)
    .where(
      and(
        eq(linkSlugTombstones.slug, slug),
        ne(linkSlugTombstones.appId, appId),
        gt(linkSlugTombstones.deletedAt, tombstoneCutoff())
      )
    )
    .limit(1);
  return !held;
}

/** Holds freed default-domain slugs for `appId`; prunes expired holds. */
export async function tombstoneDefaultSlugs(
  executor: DbExecutor,
  appId: string,
  slugs: string[]
): Promise<void> {
  if (slugs.length === 0) {
    return;
  }

  await executor
    .insert(linkSlugTombstones)
    .values(slugs.map((slug) => ({ slug, appId })))
    .onConflictDoUpdate({
      target: linkSlugTombstones.slug,
      set: { appId, deletedAt: sql`now()` },
    });
  await executor
    .delete(linkSlugTombstones)
    .where(lt(linkSlugTombstones.deletedAt, tombstoneCutoff()));
}

/** Holds every default-domain slug of an app that is about to be deleted. */
export async function tombstoneAppDefaultSlugs(
  executor: DbExecutor,
  appId: string
): Promise<void> {
  const rows = await executor
    .select({ slug: links.slug })
    .from(links)
    .where(and(eq(links.appId, appId), isNull(links.domainId)));
  await tombstoneDefaultSlugs(
    executor,
    appId,
    rows.map((row) => row.slug)
  );
}
