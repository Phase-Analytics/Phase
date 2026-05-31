import { randomUUID } from 'node:crypto';
import {
  CreateLinkDomainRequestSchema,
  CreateLinkRequestSchema,
  ErrorCode,
  ErrorResponseSchema,
  formatZodError,
  HttpStatus,
  LINK_OG_IMAGE,
  LinkAnalyticsResponseSchema,
  LinkDetailSchema,
  LinkDomainSchema,
  LinkDomainsListResponseSchema,
  LinksListResponseSchema,
  SlugAvailableResponseSchema,
  UpdateLinkRequestSchema,
} from '@phase/shared';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { db, linkDomainBindings, linkDomains, links } from '@/db';
import { auth } from '@/lib/auth';
import { assertAppAccess } from '@/lib/links/access';
import {
  getLinkAnalytics,
  getLinkClickTotalsByApp,
} from '@/lib/links/analytics';
import {
  invalidateCachedDomain,
  invalidateCachedLink,
  setCachedDomain,
} from '@/lib/links/cache';
import { LINK_CNAME_TARGET } from '@/lib/links/constants';
import { verifyDomainCname } from '@/lib/links/dns';
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

async function loadLinkDomainIds(linkId: string): Promise<string[]> {
  const rows = await db
    .select({ domainId: linkDomainBindings.domainId })
    .from(linkDomainBindings)
    .where(eq(linkDomainBindings.linkId, linkId));

  return rows.map((row) => row.domainId);
}

async function replaceLinkDomainBindings(
  linkId: string,
  domainIds: string[] | undefined
) {
  await db
    .delete(linkDomainBindings)
    .where(eq(linkDomainBindings.linkId, linkId));

  if (!domainIds || domainIds.length === 0) {
    return;
  }

  await db.insert(linkDomainBindings).values(
    domainIds.map((domainId) => ({
      linkId,
      domainId,
    }))
  );
}

type DomainLookup = Map<string, { hostname: string; status: string }>;

function serializeLinkListItem(
  row: typeof links.$inferSelect,
  options?: { shortUrl?: string; totalClicks?: number }
) {
  return {
    id: row.id,
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
  domainIds: string[],
  domainsById: DomainLookup
) {
  const shortUrl = resolvePrimaryShortUrl(row.slug, domainIds, domainsById);

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
    domainIds,
  };
}

function serializeDomain(row: typeof linkDomains.$inferSelect) {
  return {
    id: row.id,
    hostname: row.hostname,
    status: row.status as 'pending' | 'verified' | 'failed',
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

      const linkIds = rows.map((row) => row.id);
      const domainRows = await db.query.linkDomains.findMany({
        where: eq(linkDomains.appId, query.appId),
      });
      const domainsById: DomainLookup = new Map(
        domainRows.map((domain) => [
          domain.id,
          { hostname: domain.hostname, status: domain.status },
        ])
      );

      const bindingRows =
        linkIds.length > 0
          ? await db
              .select({
                linkId: linkDomainBindings.linkId,
                domainId: linkDomainBindings.domainId,
              })
              .from(linkDomainBindings)
              .where(inArray(linkDomainBindings.linkId, linkIds))
          : [];

      const domainIdsByLinkId = new Map<string, string[]>();
      for (const binding of bindingRows) {
        const existing = domainIdsByLinkId.get(binding.linkId) ?? [];
        existing.push(binding.domainId);
        domainIdsByLinkId.set(binding.linkId, existing);
      }

      const clickTotals = await getLinkClickTotalsByApp(query.appId);

      return {
        links: rows.map((row) => {
          const domainIds = domainIdsByLinkId.get(row.id) ?? [];
          const shortUrl = resolvePrimaryShortUrl(
            row.slug,
            domainIds,
            domainsById
          );

          return serializeLinkListItem(row, {
            shortUrl,
            totalClicks: clickTotals.get(row.id) ?? 0,
          });
        }),
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

      const existing = await db.query.links.findFirst({
        where: eq(links.slug, parsed.data),
        columns: { id: true },
      });

      return { available: !existing };
    },
    {
      query: t.Object({ slug: t.String() }),
      response: {
        200: SlugAvailableResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
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

      const existing = await db.query.links.findFirst({
        where: eq(links.slug, parsed.data.slug),
        columns: { id: true },
      });

      if (existing) {
        set.status = HttpStatus.CONFLICT;
        return {
          code: ErrorCode.CONFLICT,
          detail: 'Slug is already taken',
        };
      }

      const linkId = randomUUID();
      const expiresAt = parsed.data.expiresAt
        ? new Date(parsed.data.expiresAt)
        : null;

      const [row] = await db
        .insert(links)
        .values({
          id: linkId,
          appId: parsed.data.appId,
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

      await replaceLinkDomainBindings(linkId, parsed.data.domainIds ?? []);

      await invalidateCachedLink(parsed.data.slug);

      const domainIds = await loadLinkDomainIds(linkId);
      const domainsById = await loadDomainsByIdForApp(parsed.data.appId);
      return serializeLinkDetail(row, domainIds, domainsById);
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
        columns: { id: true },
      });

      if (existing) {
        set.status = HttpStatus.CONFLICT;
        return {
          code: ErrorCode.CONFLICT,
          detail: 'Domain already exists',
        };
      }

      const [row] = await db
        .insert(linkDomains)
        .values({
          id: randomUUID(),
          appId: parsed.data.appId,
          hostname,
          status: 'pending',
        })
        .returning();

      return serializeDomain(row);
    },
    {
      response: {
        200: LinkDomainSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        409: ErrorResponseSchema,
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

      const result = await verifyDomainCname(row.hostname);
      const [updated] = await db
        .update(linkDomains)
        .set({
          status: result.verified ? 'verified' : 'failed',
          lastCheckAt: new Date(),
          lastError: result.verified
            ? null
            : (result.error ?? 'Verification failed'),
        })
        .where(eq(linkDomains.id, row.id))
        .returning();

      await invalidateCachedDomain(row.hostname);
      if (result.verified) {
        await setCachedDomain(row.hostname, {
          id: updated.id,
          appId: updated.appId,
          hostname: updated.hostname,
          status: updated.status,
        });
      }

      return serializeDomain(updated);
    },
    {
      params: t.Object({ domainId: t.String() }),
      query: t.Object({ appId: t.String() }),
      response: {
        200: LinkDomainSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
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

      await db.delete(linkDomains).where(eq(linkDomains.id, row.id));
      await invalidateCachedDomain(row.hostname);

      return { success: true };
    },
    {
      params: t.Object({ domainId: t.String() }),
      query: t.Object({ appId: t.String() }),
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

      const domainIds = await loadLinkDomainIds(row.id);
      const domainsById = await loadDomainsByIdForApp(query.appId);
      return serializeLinkDetail(row, domainIds, domainsById);
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

      if (parsed.data.slug && parsed.data.slug !== existing.slug) {
        const slugTaken = await db.query.links.findFirst({
          where: eq(links.slug, parsed.data.slug),
          columns: { id: true },
        });

        if (slugTaken) {
          set.status = HttpStatus.CONFLICT;
          return {
            code: ErrorCode.CONFLICT,
            detail: 'Slug is already taken',
          };
        }
      }

      const [row] = await db
        .update(links)
        .set({
          ...(parsed.data.slug ? { slug: parsed.data.slug } : {}),
          ...(parsed.data.destinationUrl
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
          ...(parsed.data.deviceIosUrl !== undefined
            ? { deviceIosUrl: parsed.data.deviceIosUrl }
            : {}),
          ...(parsed.data.deviceAndroidUrl !== undefined
            ? { deviceAndroidUrl: parsed.data.deviceAndroidUrl }
            : {}),
          ...(parsed.data.deviceOthersUrl !== undefined
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

      if (parsed.data.domainIds !== undefined) {
        await replaceLinkDomainBindings(params.linkId, parsed.data.domainIds);
      }

      await invalidateCachedLink(existing.slug);
      if (row.slug !== existing.slug) {
        await invalidateCachedLink(row.slug);
      }

      const domainIds = await loadLinkDomainIds(row.id);
      const domainsById = await loadDomainsByIdForApp(existing.appId);
      return serializeLinkDetail(row, domainIds, domainsById);
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

      await db.delete(links).where(eq(links.id, params.linkId));
      await invalidateCachedLink(existing.slug);

      return { success: true };
    },
    {
      params: t.Object({ linkId: t.String() }),
      query: t.Object({ appId: t.String() }),
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
          contentType: 'image/webp',
        })}?v=${Date.now()}`;

        const [row] = await db
          .update(links)
          .set({ ogImageUrl })
          .where(eq(links.id, existing.id))
          .returning();

        await invalidateCachedLink(existing.slug);

        const domainIds = await loadLinkDomainIds(row.id);
        const domainsById = await loadDomainsByIdForApp(existing.appId);
        return serializeLinkDetail(row, domainIds, domainsById);
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

      await invalidateCachedLink(existing.slug);

      const domainIds = await loadLinkDomainIds(row.id);
      const domainsById = await loadDomainsByIdForApp(existing.appId);
      return serializeLinkDetail(row, domainIds, domainsById);
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

      const range = query.range ?? '7d';
      return getLinkAnalytics({
        appId: query.appId,
        linkId: params.linkId,
        range,
      });
    },
    {
      params: t.Object({ linkId: t.String() }),
      query: t.Object({
        appId: t.String(),
        range: t.Optional(t.String()),
      }),
      response: {
        200: LinkAnalyticsResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    }
  );
