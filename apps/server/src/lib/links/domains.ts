import { randomBytes, randomUUID } from 'node:crypto';
import {
  and,
  count,
  eq,
  isNotNull,
  isNull,
  lt,
  ne,
  notExists,
  type SQL,
} from 'drizzle-orm';
import { db, linkDomains, links } from '@/db';
import { invalidateCachedDomain } from './cache';
import {
  buildPendingDnsRecords,
  createOwnershipRecord,
  getDomainClient,
  getDomainProvisioningError,
  getLinkCnameTarget,
  toStoredDomainState,
  verifyDomainOwnership,
} from './domain-provider';

/**
 * Custom domain lifecycle. A hostname can be claimed (pending) by several
 * apps, each with its own TXT token; the first app to prove the TXT record
 * owns it. The Cloudflare hostname (which costs money) is only created after
 * that proof, and once owned a domain is never demoted by provider status.
 */
export const MAX_LINK_DOMAINS_PER_APP = 10;
const PENDING_DOMAIN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const OWNERSHIP_PENDING_MESSAGE =
  'Add the Phase ownership TXT record, then verify again. DNS changes can take a few minutes.';

export type LinkDomainRow = typeof linkDomains.$inferSelect;

export class LinkDomainError extends Error {
  readonly kind: 'conflict' | 'limit' | 'provider';

  constructor(kind: LinkDomainError['kind'], message: string) {
    super(message);
    this.name = 'LinkDomainError';
    this.kind = kind;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}

const hasNoLinks = notExists(
  db
    .select({ id: links.id })
    .from(links)
    .where(eq(links.domainId, linkDomains.id))
);

export function serializeLinkDomain(row: LinkDomainRow) {
  const status = row.status as 'pending' | 'verified' | 'failed';
  return {
    id: row.id,
    hostname: row.hostname,
    status,
    providerStatus: row.providerStatus,
    verificationStatus: row.verificationStatus,
    certificateStatus: row.certificateStatus,
    dnsRecords: row.dnsRecords,
    lastCheckAt: row.lastCheckAt?.toISOString() ?? null,
    lastError: row.lastError,
    degraded:
      status === 'verified' &&
      row.providerStatus !== null &&
      row.providerStatus !== 'active',
    createdAt: row.createdAt.toISOString(),
    cnameTarget: getLinkCnameTarget(),
  };
}

/**
 * Removes the provider hostname unless another app now owns it. Returns false
 * (after logging) when the provider call fails so callers keep the row.
 */
export async function releaseProviderHostname(
  row: Pick<LinkDomainRow, 'id' | 'hostname' | 'providerId' | 'legacyVerified'>
): Promise<boolean> {
  if (!row.providerId || row.legacyVerified) {
    return true;
  }

  const owner = await db.query.linkDomains.findFirst({
    where: and(
      eq(linkDomains.hostname, row.hostname),
      isNotNull(linkDomains.ownershipVerifiedAt),
      ne(linkDomains.id, row.id)
    ),
    columns: { id: true },
  });
  if (owner) {
    return true;
  }

  try {
    await getDomainClient().remove(row.hostname);
    return true;
  } catch (error) {
    console.error(
      `[Links] Failed to release provider hostname ${row.hostname}:`,
      error
    );
    return false;
  }
}

/** Lazily drops never-verified claims older than 7 days. */
export async function expireStalePendingDomains(scope: SQL): Promise<void> {
  const stale = await db
    .select()
    .from(linkDomains)
    .where(
      and(
        scope,
        isNull(linkDomains.ownershipVerifiedAt),
        eq(linkDomains.legacyVerified, false),
        lt(linkDomains.createdAt, new Date(Date.now() - PENDING_DOMAIN_TTL_MS)),
        hasNoLinks
      )
    );

  for (const row of stale) {
    if (await releaseProviderHostname(row)) {
      await db
        .delete(linkDomains)
        .where(
          and(
            eq(linkDomains.id, row.id),
            isNull(linkDomains.ownershipVerifiedAt)
          )
        );
    }
  }
}

export async function listLinkDomains(appId: string): Promise<LinkDomainRow[]> {
  await expireStalePendingDomains(eq(linkDomains.appId, appId));
  return db.query.linkDomains.findMany({
    where: eq(linkDomains.appId, appId),
    orderBy: (table, { desc }) => desc(table.createdAt),
  });
}

/** Records a pending claim. No provider call happens until TXT is proven. */
export async function createLinkDomain(
  appId: string,
  hostname: string
): Promise<LinkDomainRow> {
  await expireStalePendingDomains(eq(linkDomains.hostname, hostname));

  const existing = await db.query.linkDomains.findFirst({
    where: and(
      eq(linkDomains.appId, appId),
      eq(linkDomains.hostname, hostname)
    ),
  });
  if (existing) {
    return existing;
  }

  const owner = await db.query.linkDomains.findFirst({
    where: and(
      eq(linkDomains.hostname, hostname),
      isNotNull(linkDomains.ownershipVerifiedAt)
    ),
    columns: { id: true },
  });
  if (owner) {
    throw new LinkDomainError(
      'conflict',
      'This hostname is already connected to another app'
    );
  }

  const [{ value: domainCount } = { value: 0 }] = await db
    .select({ value: count() })
    .from(linkDomains)
    .where(eq(linkDomains.appId, appId));
  if (domainCount >= MAX_LINK_DOMAINS_PER_APP) {
    throw new LinkDomainError(
      'limit',
      `An app can have at most ${MAX_LINK_DOMAINS_PER_APP} custom domains`
    );
  }

  const token = randomBytes(32).toString('hex');
  const [inserted] = await db
    .insert(linkDomains)
    .values({
      id: randomUUID(),
      appId,
      hostname,
      status: 'pending',
      ownershipToken: token,
      dnsRecords: buildPendingDnsRecords(hostname, token),
      lastError: OWNERSHIP_PENDING_MESSAGE,
    })
    .onConflictDoNothing()
    .returning();
  if (inserted) {
    return inserted;
  }

  const raced = await db.query.linkDomains.findFirst({
    where: and(
      eq(linkDomains.appId, appId),
      eq(linkDomains.hostname, hostname)
    ),
  });
  if (!raced) {
    throw new Error(`Failed to create link domain ${hostname}`);
  }
  return raced;
}

async function updateDomain(
  id: string,
  values: Partial<typeof linkDomains.$inferInsert>
): Promise<LinkDomainRow> {
  const [row] = await db
    .update(linkDomains)
    .set(values)
    .where(eq(linkDomains.id, id))
    .returning();
  if (!row) {
    throw new LinkDomainError('conflict', 'Domain no longer exists');
  }
  return row;
}

async function claimOwnership(row: LinkDomainRow): Promise<LinkDomainRow> {
  let claimed: LinkDomainRow | undefined;
  try {
    [claimed] = await db
      .update(linkDomains)
      .set({
        ownershipVerifiedAt: new Date(),
        dnsRecords: row.ownershipToken
          ? [
              createOwnershipRecord(row.hostname, row.ownershipToken, true),
              ...row.dnsRecords.filter((r) => r.purpose !== 'ownership'),
            ]
          : row.dnsRecords,
      })
      .where(
        and(eq(linkDomains.id, row.id), isNull(linkDomains.ownershipVerifiedAt))
      )
      .returning();
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new LinkDomainError(
        'conflict',
        'This hostname was already verified by another app'
      );
    }
    throw error;
  }

  // Other apps' never-verified claims can no longer succeed.
  await db
    .delete(linkDomains)
    .where(
      and(
        eq(linkDomains.hostname, row.hostname),
        ne(linkDomains.id, row.id),
        isNull(linkDomains.ownershipVerifiedAt),
        hasNoLinks
      )
    );

  return claimed ?? row;
}

export async function verifyLinkDomain(
  row: LinkDomainRow
): Promise<LinkDomainRow> {
  if (row.legacyVerified && !row.providerId && row.status === 'verified') {
    return row;
  }

  let current = row;
  if (!current.ownershipVerifiedAt) {
    const proven = current.ownershipToken
      ? await verifyDomainOwnership(current.hostname, current.ownershipToken)
      : false;
    if (!proven) {
      return updateDomain(current.id, {
        lastCheckAt: new Date(),
        lastError: OWNERSHIP_PENDING_MESSAGE,
      });
    }
    current = await claimOwnership(current);
  }

  try {
    // add() returns the existing provider hostname when it already exists.
    const provisioned = await getDomainClient().add(current.hostname);
    const state = toStoredDomainState(
      provisioned,
      current.ownershipToken
        ? { token: current.ownershipToken, verified: true }
        : undefined
    );
    // Sticky: transient provider states never take a live domain offline.
    const status = current.status === 'verified' ? 'verified' : state.status;
    const updated = await updateDomain(current.id, { ...state, status });
    await invalidateCachedDomain(updated.hostname);
    return updated;
  } catch (error) {
    if (error instanceof LinkDomainError) {
      throw error;
    }
    const detail = getDomainProvisioningError(error);
    await updateDomain(current.id, {
      lastCheckAt: new Date(),
      lastError: detail,
    });
    throw new LinkDomainError('provider', detail);
  }
}

export async function deleteLinkDomain(row: LinkDomainRow): Promise<void> {
  const linked = await db.query.links.findFirst({
    where: eq(links.domainId, row.id),
    columns: { id: true },
  });
  if (linked) {
    throw new LinkDomainError(
      'conflict',
      'Move or remove links using this domain first'
    );
  }

  if (!(await releaseProviderHostname(row))) {
    throw new LinkDomainError(
      'provider',
      'Domain provider is temporarily unavailable. Try again shortly.'
    );
  }

  await db.delete(linkDomains).where(eq(linkDomains.id, row.id));
  await invalidateCachedDomain(row.hostname);
}
