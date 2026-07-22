import { randomBytes, randomUUID } from 'node:crypto';
import {
  CreateLinkDomainRequestSchema,
  CreateLinkRequestSchema,
  ErrorCode,
  ErrorResponseSchema,
  formatZodError,
  HttpStatus,
  LINK_OG_IMAGE,
  LinkAnalyticsResponseSchema,
  LinkClicksListResponseSchema,
  LinkDetailSchema,
  LinkDomainSchema,
  LinkDomainsListResponseSchema,
  LinksListResponseSchema,
  SlugAvailableResponseSchema,
  UpdateLinkRequestSchema,
} from '@phase/shared';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { db, linkDomains, links, policies } from '@/db';
import { auth } from '@/lib/auth';
import { assertAppAccess } from '@/lib/links/access';
import {
  getLinkAnalytics,
  getLinkClicks,
  getLinkClickTotalsByApp,
} from '@/lib/links/analytics';
import {
  invalidateCachedDomain,
  invalidateCachedLink,
  setCachedDomain,
} from '@/lib/links/cache';
import { LINK_CNAME_TARGET } from '@/lib/links/constants';
import {
  getDomainClient,
  getDomainProvisioningError,
  toStoredDomainState,
  verifyDomainOwnership,
} from '@/lib/links/domain-provider';
import {
  LinkOgImageError,
  processLinkOgImage,
} from '@/lib/links/link-og-image';
import { buildDefaultShortUrl, resolvePrimaryShortUrl } from '@/lib/links/urls';
import {
  authPlugin,
  type BetterAuthSession,
  type BetterAuthUser,
} from '@/lib/middleware';
import {
  buildLinkOgObjectKey,
  deleteR2ObjectByPublicUrl,
  isR2Configured,
  uploadToR2,
} from '@/lib/r2';

type AuthContext = { user: BetterAuthUser; session: BetterAuthSession };

async function loadDomainsByIdForApp(appId: string): Promise<DomainLookup> {
  const domainRows = await db.query.linkDomains.findMany({
    where: eq(linkDomains.appId, appId),
  });

  return new Map(
    domainRows.map((domain) => [
      domain.id,
      { hostname: domain.hostname, status: domain.status },
    ])
  );
}

function loadDomainForApp(
  domainId: string | null | undefined,
  appId: string,
  verifiedOnly = false
) {
  if (!domainId) {
    return null;
  }

  return db.query.linkDomains.findFirst({
    where: and(
      eq(linkDomains.id, domainId),
      eq(linkDomains.appId, appId),
      ...(verifiedOnly ? [eq(linkDomains.status, 'verified')] : [])
    ),
  });
}

async function isSlugAvailable(
  slug: string,
  domainId: string | null,
  excludeLinkId?: string
): Promise<boolean> {
  const existing = await db.query.links.findFirst({
    where: and(
      eq(links.slug, slug),
      domainId ? eq(links.domainId, domainId) : isNull(links.domainId)
    ),
    columns: { id: true },
  });

  return !existing || existing.id === excludeLinkId;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}

type DomainLookup = Map<string, { hostname: string; status: string }>;

function serializeLinkListItem(
  row: typeof links.$inferSelect,
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
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(options?.totalClicks !== undefined
      ? { totalClicks: options.totalClicks }
      : {}),
  };
}

function serializeLinkDetail(
  row: typeof links.$inferSelect,
  domainsById: DomainLookup,
  options?: { policyId?: string | null }
) {
  const shortUrl = resolvePrimaryShortUrl(row.slug, row.domainId, domainsById);
  const policyId = options?.policyId ?? null;

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

async function getPolicyIdForLink(linkId: string): Promise<string | null> {
  const row = await db.query.policies.findFirst({
    where: eq(policies.linkId, linkId),
    columns: { id: true },
  });
  return row?.id ?? null;
}

function serializeDomain(row: typeof linkDomains.$inferSelect) {
  return {
    id: row.id,
    hostname: row.hostname,
    status: row.status as 'pending' | 'verified' | 'failed',
    providerStatus: row.providerStatus,
    verificationStatus: row.verificationStatus,
    certificateStatus: row.certificateStatus,
    dnsRecords: row.dnsRecords,
    lastCheckAt: row.lastCheckAt?.toISOString() ?? null,
    lastError: row.lastError,
    createdAt: row.createdAt.toISOString(),
    cnameTarget: LINK_CNAME_TARGET,
  };
}

export const linksWebRouter = new Elysia({ prefix: '/links' })
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    return {
      user: session?.user as BetterAuthUser,
      session: session?.session as BetterAuthSession,
    };
  })
  .use(authPlugin)
  .get(
    '/',
    async (ctx) => {
      const { query, user, set } = ctx as typeof ctx & AuthContext;

      if (!user?.id) {
        set.status = HttpStatus.UNAUTHORIZED;
        return {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'Authentication required',
        };
      }

      const app = await assertAppAccess(query.appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return { code: ErrorCode.FORBIDDEN, detail: 'Access denied' };
      }

      const rows = await db
        .select()
        .from(links)
        .where(eq(links.appId, query.appId))
        .orderBy(desc(links.createdAt));

      const domainRows = await db.query.linkDomains.findMany({
        where: eq(linkDomains.appId, query.appId),
      });
      const domainsById: DomainLookup = new Map(
        domainRows.map((domain) => [
          domain.id,
          { hostname: domain.hostname, status: domain.status },
        ])
      );
      const clickTotals = await getLinkClickTotalsByApp(query.appId);

      return {
        links: rows.map((row) =>
          serializeLinkListItem(row, {
            shortUrl: resolvePrimaryShortUrl(
              row.slug,
              row.domainId,
              domainsById
            ),
            totalClicks: clickTotals.get(row.id) ?? 0,
          })
        ),
      };
    },
    {
      query: t.Object({ appId: t.String() }),
      response: {
        200: LinksListResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/slug-available',
    async (ctx) => {
      const { query, user, set } = ctx as typeof ctx & AuthContext;

      if (!user?.id) {
        set.status = HttpStatus.UNAUTHORIZED;
        return {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'Authentication required',
        };
      }

      const parsed = CreateLinkRequestSchema.shape.slug.safeParse(query.slug);
      if (!parsed.success) {
        set.status = HttpStatus.BAD_REQUEST;
        return {
          code: ErrorCode.VALIDATION_ERROR,
          detail: formatZodError(parsed.error),
        };
      }

      const app = await assertAppAccess(query.appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return { code: ErrorCode.FORBIDDEN, detail: 'Access denied' };
      }

      const domainId = query.domainId || null;
      if (domainId) {
        const domain = await loadDomainForApp(domainId, query.appId);
        if (!domain) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'Select a verified domain from this app',
          };
        }
      }

      return {
        available: await isSlugAvailable(
          parsed.data,
          domainId,
          query.excludeLinkId
        ),
      };
    },
    {
      query: t.Object({
        appId: t.String(),
        slug: t.String(),
        domainId: t.Optional(t.String()),
        excludeLinkId: t.Optional(t.String()),
      }),
      response: {
        200: SlugAvailableResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
      },
    }
  )
  .post(
    '/',
    async (ctx) => {
      const { body, user, set } = ctx as typeof ctx & AuthContext;

      if (!user?.id) {
        set.status = HttpStatus.UNAUTHORIZED;
        return {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'Authentication required',
        };
      }

      const parsed = CreateLinkRequestSchema.safeParse(body);
      if (!parsed.success) {
        set.status = HttpStatus.BAD_REQUEST;
        return {
          code: ErrorCode.VALIDATION_ERROR,
          detail: formatZodError(parsed.error),
        };
      }

      const app = await assertAppAccess(parsed.data.appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return { code: ErrorCode.FORBIDDEN, detail: 'Access denied' };
      }

      const domainId = parsed.data.domainId ?? null;
      if (domainId) {
        const domain = await loadDomainForApp(
          domainId,
          parsed.data.appId,
          true
        );
        if (!domain) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'Select a verified domain from this app',
          };
        }
      }

      if (!(await isSlugAvailable(parsed.data.slug, domainId))) {
        set.status = HttpStatus.CONFLICT;
        return {
          code: ErrorCode.CONFLICT,
          detail: 'This path is already taken on the selected domain',
        };
      }

      const linkId = randomUUID();
      const expiresAt = parsed.data.expiresAt
        ? new Date(parsed.data.expiresAt)
        : null;

      let row: typeof links.$inferSelect;
      try {
        [row] = await db
          .insert(links)
          .values({
            id: linkId,
            appId: parsed.data.appId,
            domainId,
            name: parsed.data.name?.trim() || null,
            slug: parsed.data.slug,
            destinationUrl: parsed.data.destinationUrl,
            utmSource: parsed.data.utmSource ?? null,
            utmMedium: parsed.data.utmMedium ?? null,
            utmCampaign: parsed.data.utmCampaign ?? null,
            utmTerm: parsed.data.utmTerm ?? null,
            utmContent: parsed.data.utmContent ?? null,
            deviceIosUrl: parsed.data.deviceIosUrl ?? null,
            deviceAndroidUrl: parsed.data.deviceAndroidUrl ?? null,
            deviceOthersUrl: parsed.data.deviceOthersUrl ?? null,
            ogTitle: parsed.data.ogTitle ?? null,
            ogDescription: parsed.data.ogDescription ?? null,
            expiresAt,
            disabledAt: parsed.data.disabled ? new Date() : null,
          })
          .returning();
      } catch (error) {
        if (isUniqueViolation(error)) {
          set.status = HttpStatus.CONFLICT;
          return {
            code: ErrorCode.CONFLICT,
            detail: 'This path is already taken on the selected domain',
          };
        }
        throw error;
      }

      await invalidateCachedLink(row.slug, row.domainId);

      const domainsById = await loadDomainsByIdForApp(parsed.data.appId);
      return serializeLinkDetail(row, domainsById);
    },
    {
      response: {
        200: LinkDetailSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        409: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/domains',
    async (ctx) => {
      const { query, user, set } = ctx as typeof ctx & AuthContext;

      if (!user?.id) {
        set.status = HttpStatus.UNAUTHORIZED;
        return {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'Authentication required',
        };
      }

      const app = await assertAppAccess(query.appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return { code: ErrorCode.FORBIDDEN, detail: 'Access denied' };
      }

      const rows = await db
        .select()
        .from(linkDomains)
        .where(eq(linkDomains.appId, query.appId))
        .orderBy(desc(linkDomains.createdAt));

      return { domains: rows.map(serializeDomain) };
    },
    {
      query: t.Object({ appId: t.String() }),
      response: {
        200: LinkDomainsListResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
      },
    }
  )
  .post(
    '/domains',
    async (ctx) => {
      const { body, user, set } = ctx as typeof ctx & AuthContext;

      if (!user?.id) {
        set.status = HttpStatus.UNAUTHORIZED;
        return {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'Authentication required',
        };
      }

      const parsed = CreateLinkDomainRequestSchema.safeParse(body);
      if (!parsed.success) {
        set.status = HttpStatus.BAD_REQUEST;
        return {
          code: ErrorCode.VALIDATION_ERROR,
          detail: formatZodError(parsed.error),
        };
      }

      const app = await assertAppAccess(parsed.data.appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return { code: ErrorCode.FORBIDDEN, detail: 'Access denied' };
      }

      const hostname = parsed.data.hostname.toLowerCase();
      const existing = await db.query.linkDomains.findFirst({
        where: eq(linkDomains.hostname, hostname),
      });

      if (
        existing?.appId === parsed.data.appId &&
        existing.status === 'verified'
      ) {
        return serializeDomain(existing);
      }

      let row = existing;
      if (!row) {
        const [inserted] = await db
          .insert(linkDomains)
          .values({
            id: randomUUID(),
            appId: parsed.data.appId,
            hostname,
            status: 'pending',
            ownershipToken: randomBytes(32).toString('hex'),
          })
          .onConflictDoNothing()
          .returning();
        row =
          inserted ??
          (await db.query.linkDomains.findFirst({
            where: eq(linkDomains.hostname, hostname),
          }));
      }

      if (!row || row.appId !== parsed.data.appId) {
        set.status = HttpStatus.CONFLICT;
        return {
          code: ErrorCode.CONFLICT,
          detail: 'Domain already exists',
        };
      }

      try {
        const provisioned = await getDomainClient().add(hostname);
        const [updated] = await db
          .update(linkDomains)
          .set(
            toStoredDomainState(
              provisioned,
              row.ownershipToken
                ? { token: row.ownershipToken, verified: false }
                : undefined
            )
          )
          .where(eq(linkDomains.id, row.id))
          .returning();

        await invalidateCachedDomain(hostname);
        if (updated.status === 'verified') {
          await setCachedDomain(hostname, {
            id: updated.id,
            appId: updated.appId,
            hostname: updated.hostname,
            status: updated.status,
          });
        }

        return serializeDomain(updated);
      } catch (error) {
        const detail = getDomainProvisioningError(error);
        await db
          .update(linkDomains)
          .set({ status: 'failed', lastCheckAt: new Date(), lastError: detail })
          .where(eq(linkDomains.id, row.id));
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return { code: ErrorCode.INTERNAL_SERVER_ERROR, detail };
      }
    },
    {
      response: {
        200: LinkDomainSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        409: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .post(
    '/domains/:domainId/verify',
    async (ctx) => {
      const { params, query, user, set } = ctx as typeof ctx & AuthContext;

      if (!user?.id) {
        set.status = HttpStatus.UNAUTHORIZED;
        return {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'Authentication required',
        };
      }

      const app = await assertAppAccess(query.appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return { code: ErrorCode.FORBIDDEN, detail: 'Access denied' };
      }

      const row = await db.query.linkDomains.findFirst({
        where: and(
          eq(linkDomains.id, params.domainId),
          eq(linkDomains.appId, query.appId)
        ),
      });

      if (!row) {
        set.status = HttpStatus.NOT_FOUND;
        return { code: ErrorCode.NOT_FOUND, detail: 'Domain not found' };
      }

      if (!row.providerId && row.status === 'verified') {
        return serializeDomain(row);
      }

      try {
        const [domain, ownershipVerified] = await Promise.all([
          row.providerId
            ? getDomainClient().refresh(row.hostname)
            : getDomainClient().add(row.hostname),
          row.ownershipToken
            ? verifyDomainOwnership(row.hostname, row.ownershipToken)
            : Promise.resolve(true),
        ]);
        const [updated] = await db
          .update(linkDomains)
          .set({
            ...toStoredDomainState(
              domain,
              row.ownershipToken
                ? { token: row.ownershipToken, verified: ownershipVerified }
                : undefined
            ),
            ownershipVerifiedAt: ownershipVerified ? new Date() : null,
          })
          .where(eq(linkDomains.id, row.id))
          .returning();

        await invalidateCachedDomain(row.hostname);
        if (updated.status === 'verified') {
          await setCachedDomain(row.hostname, {
            id: updated.id,
            appId: updated.appId,
            hostname: updated.hostname,
            status: updated.status,
          });
        }

        return serializeDomain(updated);
      } catch (error) {
        const detail = getDomainProvisioningError(error);
        await db
          .update(linkDomains)
          .set({ lastCheckAt: new Date(), lastError: detail })
          .where(eq(linkDomains.id, row.id));
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return { code: ErrorCode.INTERNAL_SERVER_ERROR, detail };
      }
    },
    {
      params: t.Object({ domainId: t.String() }),
      query: t.Object({ appId: t.String() }),
      response: {
        200: LinkDomainSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .delete(
    '/domains/:domainId',
    async (ctx) => {
      const { params, query, user, set } = ctx as typeof ctx & AuthContext;

      if (!user?.id) {
        set.status = HttpStatus.UNAUTHORIZED;
        return {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'Authentication required',
        };
      }

      const app = await assertAppAccess(query.appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return { code: ErrorCode.FORBIDDEN, detail: 'Access denied' };
      }

      const row = await db.query.linkDomains.findFirst({
        where: and(
          eq(linkDomains.id, params.domainId),
          eq(linkDomains.appId, query.appId)
        ),
      });

      if (!row) {
        set.status = HttpStatus.NOT_FOUND;
        return { code: ErrorCode.NOT_FOUND, detail: 'Domain not found' };
      }

      const linked = await db.query.links.findFirst({
        where: eq(links.domainId, row.id),
        columns: { id: true },
      });
      if (linked) {
        set.status = HttpStatus.CONFLICT;
        return {
          code: ErrorCode.CONFLICT,
          detail: 'Move or remove links using this domain first',
        };
      }

      if (row.providerId && !row.legacyVerified) {
        try {
          await getDomainClient().remove(row.hostname);
        } catch (error) {
          const detail = getDomainProvisioningError(error);
          set.status = HttpStatus.INTERNAL_SERVER_ERROR;
          return { code: ErrorCode.INTERNAL_SERVER_ERROR, detail };
        }
      }

      await db.delete(linkDomains).where(eq(linkDomains.id, row.id));
      await invalidateCachedDomain(row.hostname);

      return { success: true };
    },
    {
      params: t.Object({ domainId: t.String() }),
      query: t.Object({ appId: t.String() }),
      response: {
        200: t.Object({ success: t.Boolean() }),
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        409: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/:linkId',
    async (ctx) => {
      const { params, query, user, set } = ctx as typeof ctx & AuthContext;

      if (!user?.id) {
        set.status = HttpStatus.UNAUTHORIZED;
        return {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'Authentication required',
        };
      }

      const app = await assertAppAccess(query.appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return { code: ErrorCode.FORBIDDEN, detail: 'Access denied' };
      }

      const row = await db.query.links.findFirst({
        where: and(eq(links.id, params.linkId), eq(links.appId, query.appId)),
      });

      if (!row) {
        set.status = HttpStatus.NOT_FOUND;
        return { code: ErrorCode.NOT_FOUND, detail: 'Link not found' };
      }

      const domainsById = await loadDomainsByIdForApp(query.appId);
      const policyId = await getPolicyIdForLink(row.id);
      return serializeLinkDetail(row, domainsById, { policyId });
    },
    {
      params: t.Object({ linkId: t.String() }),
      query: t.Object({ appId: t.String() }),
      response: {
        200: LinkDetailSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    }
  )
  .patch(
    '/:linkId',
    async (ctx) => {
      const { params, query, body, user, set } = ctx as typeof ctx &
        AuthContext;

      if (!user?.id) {
        set.status = HttpStatus.UNAUTHORIZED;
        return {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'Authentication required',
        };
      }

      const parsed = UpdateLinkRequestSchema.safeParse(body);
      if (!parsed.success) {
        set.status = HttpStatus.BAD_REQUEST;
        return {
          code: ErrorCode.VALIDATION_ERROR,
          detail: formatZodError(parsed.error),
        };
      }

      const app = await assertAppAccess(query.appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return { code: ErrorCode.FORBIDDEN, detail: 'Access denied' };
      }

      const existing = await db.query.links.findFirst({
        where: and(eq(links.id, params.linkId), eq(links.appId, query.appId)),
      });

      if (!existing) {
        set.status = HttpStatus.NOT_FOUND;
        return { code: ErrorCode.NOT_FOUND, detail: 'Link not found' };
      }

      const policyId = await getPolicyIdForLink(existing.id);
      const destinationLocked = Boolean(policyId);

      if (destinationLocked) {
        if (
          parsed.data.destinationUrl &&
          parsed.data.destinationUrl !== existing.destinationUrl
        ) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'Destination is managed by the linked policy',
          };
        }

        const deviceChanged =
          (parsed.data.deviceIosUrl !== undefined &&
            parsed.data.deviceIosUrl !== existing.deviceIosUrl) ||
          (parsed.data.deviceAndroidUrl !== undefined &&
            parsed.data.deviceAndroidUrl !== existing.deviceAndroidUrl) ||
          (parsed.data.deviceOthersUrl !== undefined &&
            parsed.data.deviceOthersUrl !== existing.deviceOthersUrl);

        if (deviceChanged) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'Device routing is managed by the linked policy',
          };
        }
      }

      const nextSlug = parsed.data.slug ?? existing.slug;
      const nextDomainId =
        parsed.data.domainId !== undefined
          ? parsed.data.domainId
          : existing.domainId;

      if (nextDomainId) {
        const domain = await loadDomainForApp(
          nextDomainId,
          existing.appId,
          nextDomainId !== existing.domainId
        );
        if (!domain) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'Select a verified domain from this app',
          };
        }
      }

      if (!(await isSlugAvailable(nextSlug, nextDomainId, existing.id))) {
        set.status = HttpStatus.CONFLICT;
        return {
          code: ErrorCode.CONFLICT,
          detail: 'This path is already taken on the selected domain',
        };
      }

      let row: typeof links.$inferSelect;
      try {
        [row] = await db
          .update(links)
          .set({
            ...(parsed.data.name !== undefined
              ? { name: parsed.data.name?.trim() || null }
              : {}),
            ...(parsed.data.slug ? { slug: parsed.data.slug } : {}),
            ...(parsed.data.domainId !== undefined
              ? { domainId: parsed.data.domainId }
              : {}),
            ...(!destinationLocked && parsed.data.destinationUrl
              ? { destinationUrl: parsed.data.destinationUrl }
              : {}),
            ...(parsed.data.utmSource !== undefined
              ? { utmSource: parsed.data.utmSource }
              : {}),
            ...(parsed.data.utmMedium !== undefined
              ? { utmMedium: parsed.data.utmMedium }
              : {}),
            ...(parsed.data.utmCampaign !== undefined
              ? { utmCampaign: parsed.data.utmCampaign }
              : {}),
            ...(parsed.data.utmTerm !== undefined
              ? { utmTerm: parsed.data.utmTerm }
              : {}),
            ...(parsed.data.utmContent !== undefined
              ? { utmContent: parsed.data.utmContent }
              : {}),
            ...(!destinationLocked && parsed.data.deviceIosUrl !== undefined
              ? { deviceIosUrl: parsed.data.deviceIosUrl }
              : {}),
            ...(!destinationLocked && parsed.data.deviceAndroidUrl !== undefined
              ? { deviceAndroidUrl: parsed.data.deviceAndroidUrl }
              : {}),
            ...(!destinationLocked && parsed.data.deviceOthersUrl !== undefined
              ? { deviceOthersUrl: parsed.data.deviceOthersUrl }
              : {}),
            ...(parsed.data.ogTitle !== undefined
              ? { ogTitle: parsed.data.ogTitle }
              : {}),
            ...(parsed.data.ogDescription !== undefined
              ? { ogDescription: parsed.data.ogDescription }
              : {}),
            ...(parsed.data.expiresAt !== undefined
              ? {
                  expiresAt: parsed.data.expiresAt
                    ? new Date(parsed.data.expiresAt)
                    : null,
                }
              : {}),
            ...(parsed.data.disabled !== undefined
              ? {
                  disabledAt: parsed.data.disabled ? new Date() : null,
                }
              : {}),
          })
          .where(eq(links.id, params.linkId))
          .returning();
      } catch (error) {
        if (isUniqueViolation(error)) {
          set.status = HttpStatus.CONFLICT;
          return {
            code: ErrorCode.CONFLICT,
            detail: 'This path is already taken on the selected domain',
          };
        }
        throw error;
      }

      await invalidateCachedLink(existing.slug, existing.domainId);
      await invalidateCachedLink(row.slug, row.domainId);

      const domainsById = await loadDomainsByIdForApp(existing.appId);
      return serializeLinkDetail(row, domainsById, { policyId });
    },
    {
      params: t.Object({ linkId: t.String() }),
      query: t.Object({ appId: t.String() }),
      response: {
        200: LinkDetailSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        409: ErrorResponseSchema,
      },
    }
  )
  .delete(
    '/:linkId',
    async (ctx) => {
      const { params, query, user, set } = ctx as typeof ctx & AuthContext;

      if (!user?.id) {
        set.status = HttpStatus.UNAUTHORIZED;
        return {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'Authentication required',
        };
      }

      const app = await assertAppAccess(query.appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return { code: ErrorCode.FORBIDDEN, detail: 'Access denied' };
      }

      const existing = await db.query.links.findFirst({
        where: and(eq(links.id, params.linkId), eq(links.appId, query.appId)),
      });

      if (!existing) {
        set.status = HttpStatus.NOT_FOUND;
        return { code: ErrorCode.NOT_FOUND, detail: 'Link not found' };
      }

      const policyId = await getPolicyIdForLink(existing.id);
      if (policyId) {
        set.status = HttpStatus.CONFLICT;
        return {
          code: ErrorCode.CONFLICT,
          detail: 'Delete the linked policy instead',
        };
      }

      await db.delete(links).where(eq(links.id, params.linkId));
      await invalidateCachedLink(existing.slug, existing.domainId);

      return { success: true };
    },
    {
      params: t.Object({ linkId: t.String() }),
      query: t.Object({ appId: t.String() }),
      response: {
        200: t.Object({ success: t.Boolean() }),
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        409: ErrorResponseSchema,
      },
    }
  )
  .post(
    '/:linkId/og-image',
    async (ctx) => {
      const { params, query, user, set, request } = ctx as typeof ctx &
        AuthContext;

      if (!user?.id) {
        set.status = HttpStatus.UNAUTHORIZED;
        return {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'Authentication required',
        };
      }

      if (!isR2Configured()) {
        set.status = 503;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Image uploads are not configured',
        };
      }

      const app = await assertAppAccess(query.appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return { code: ErrorCode.FORBIDDEN, detail: 'Access denied' };
      }

      const existing = await db.query.links.findFirst({
        where: and(eq(links.id, params.linkId), eq(links.appId, query.appId)),
      });

      if (!existing) {
        set.status = HttpStatus.NOT_FOUND;
        return { code: ErrorCode.NOT_FOUND, detail: 'Link not found' };
      }

      const formData = await request.formData();
      const file = formData.get('file');

      if (!(file instanceof File)) {
        set.status = HttpStatus.BAD_REQUEST;
        return {
          code: ErrorCode.VALIDATION_ERROR,
          detail: 'Missing image file',
        };
      }

      if (!file.size) {
        set.status = HttpStatus.BAD_REQUEST;
        return {
          code: ErrorCode.VALIDATION_ERROR,
          detail: 'Missing image file',
        };
      }

      if (file.size > LINK_OG_IMAGE.maxUploadBytes) {
        set.status = HttpStatus.BAD_REQUEST;
        return {
          code: ErrorCode.VALIDATION_ERROR,
          detail: `Image must be ${Math.round(LINK_OG_IMAGE.maxUploadBytes / (1024 * 1024))}MB or smaller`,
        };
      }

      const input = Buffer.from(await file.arrayBuffer());

      let processed: Buffer;
      try {
        processed = await processLinkOgImage(input);
      } catch (error) {
        set.status = HttpStatus.BAD_REQUEST;
        return {
          code: ErrorCode.VALIDATION_ERROR,
          detail:
            error instanceof LinkOgImageError
              ? error.message
              : 'Invalid image file',
        };
      }

      const objectKey = buildLinkOgObjectKey(existing.appId, existing.id);

      try {
        await deleteR2ObjectByPublicUrl(existing.ogImageUrl);

        const ogImageUrl = `${await uploadToR2({
          key: objectKey,
          body: processed,
          contentType: 'image/jpeg',
        })}?v=${Date.now()}`;

        const [row] = await db
          .update(links)
          .set({ ogImageUrl })
          .where(eq(links.id, existing.id))
          .returning();

        await invalidateCachedLink(existing.slug, existing.domainId);

        const domainsById = await loadDomainsByIdForApp(existing.appId);
        const policyId = await getPolicyIdForLink(row.id);
        return serializeLinkDetail(row, domainsById, { policyId });
      } catch (error) {
        console.error('[links] OG image upload failed:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to upload image',
        };
      }
    },
    {
      params: t.Object({ linkId: t.String() }),
      query: t.Object({ appId: t.String() }),
      parse: 'none',
      response: {
        200: LinkDetailSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    }
  )
  .delete(
    '/:linkId/og-image',
    async (ctx) => {
      const { params, query, user, set } = ctx as typeof ctx & AuthContext;

      if (!user?.id) {
        set.status = HttpStatus.UNAUTHORIZED;
        return {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'Authentication required',
        };
      }

      const app = await assertAppAccess(query.appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return { code: ErrorCode.FORBIDDEN, detail: 'Access denied' };
      }

      const existing = await db.query.links.findFirst({
        where: and(eq(links.id, params.linkId), eq(links.appId, query.appId)),
      });

      if (!existing) {
        set.status = HttpStatus.NOT_FOUND;
        return { code: ErrorCode.NOT_FOUND, detail: 'Link not found' };
      }

      await deleteR2ObjectByPublicUrl(existing.ogImageUrl);

      const [row] = await db
        .update(links)
        .set({ ogImageUrl: null })
        .where(eq(links.id, existing.id))
        .returning();

      await invalidateCachedLink(existing.slug, existing.domainId);

      const domainsById = await loadDomainsByIdForApp(existing.appId);
      const policyId = await getPolicyIdForLink(row.id);
      return serializeLinkDetail(row, domainsById, { policyId });
    },
    {
      params: t.Object({ linkId: t.String() }),
      query: t.Object({ appId: t.String() }),
      response: {
        200: LinkDetailSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/:linkId/analytics',
    async (ctx) => {
      const { params, query, user, set } = ctx as typeof ctx & AuthContext;

      if (!user?.id) {
        set.status = HttpStatus.UNAUTHORIZED;
        return {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'Authentication required',
        };
      }

      const app = await assertAppAccess(query.appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return { code: ErrorCode.FORBIDDEN, detail: 'Access denied' };
      }

      const row = await db.query.links.findFirst({
        where: and(eq(links.id, params.linkId), eq(links.appId, query.appId)),
        columns: { id: true },
      });

      if (!row) {
        set.status = HttpStatus.NOT_FOUND;
        return { code: ErrorCode.NOT_FOUND, detail: 'Link not found' };
      }

      return getLinkAnalytics({
        appId: query.appId,
        linkId: params.linkId,
      });
    },
    {
      params: t.Object({ linkId: t.String() }),
      query: t.Object({ appId: t.String() }),
      response: {
        200: LinkAnalyticsResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/:linkId/clicks',
    async (ctx) => {
      const { params, query, user, set } = ctx as typeof ctx & AuthContext;

      if (!user?.id) {
        set.status = HttpStatus.UNAUTHORIZED;
        return {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'Authentication required',
        };
      }

      const app = await assertAppAccess(query.appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return { code: ErrorCode.FORBIDDEN, detail: 'Access denied' };
      }

      const row = await db.query.links.findFirst({
        where: and(eq(links.id, params.linkId), eq(links.appId, query.appId)),
        columns: { id: true },
      });

      if (!row) {
        set.status = HttpStatus.NOT_FOUND;
        return { code: ErrorCode.NOT_FOUND, detail: 'Link not found' };
      }

      const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
      const pageSize = Math.min(
        Math.max(1, Number.parseInt(query.pageSize ?? '10', 10) || 10),
        100
      );

      return getLinkClicks({
        appId: query.appId,
        linkId: params.linkId,
        page,
        pageSize,
      });
    },
    {
      params: t.Object({ linkId: t.String() }),
      query: t.Object({
        appId: t.String(),
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
      }),
      response: {
        200: LinkClicksListResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    }
  );
