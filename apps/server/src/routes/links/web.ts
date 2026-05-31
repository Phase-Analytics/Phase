import { randomUUID } from 'node:crypto';
import {
  CreateLinkDomainRequestSchema,
  CreateLinkRequestSchema,
  ErrorCode,
  ErrorResponseSchema,
  HttpStatus,
  LinkAnalyticsResponseSchema,
  LinkDetailSchema,
  LinkDomainSchema,
  LinkDomainsListResponseSchema,
  LinksListResponseSchema,
  SlugAvailableResponseSchema,
  UpdateLinkRequestSchema,
} from '@phase/shared';
import { and, desc, eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { db, linkDomainBindings, linkDomains, links } from '@/db';
import { auth } from '@/lib/auth';
import { assertAppAccess } from '@/lib/links/access';
import { getLinkAnalytics } from '@/lib/links/analytics';
import {
  invalidateCachedDomain,
  invalidateCachedLink,
  setCachedDomain,
} from '@/lib/links/cache';
import { LINK_CNAME_TARGET } from '@/lib/links/constants';
import { verifyDomainCname } from '@/lib/links/dns';
import { buildDefaultShortUrl } from '@/lib/links/urls';
import {
  authPlugin,
  type BetterAuthSession,
  type BetterAuthUser,
} from '@/lib/middleware';

type AuthContext = { user: BetterAuthUser; session: BetterAuthSession };

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

function serializeLinkListItem(
  row: typeof links.$inferSelect,
  totalClicks?: number
) {
  return {
    id: row.id,
    slug: row.slug,
    destinationUrl: row.destinationUrl,
    shortUrl: buildDefaultShortUrl(row.slug),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    disabledAt: row.disabledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(totalClicks !== undefined ? { totalClicks } : {}),
  };
}

function serializeLinkDetail(
  row: typeof links.$inferSelect,
  domainIds: string[]
) {
  return {
    ...serializeLinkListItem(row),
    appId: row.appId,
    utmSource: row.utmSource,
    utmMedium: row.utmMedium,
    utmCampaign: row.utmCampaign,
    utmTerm: row.utmTerm,
    utmContent: row.utmContent,
    deviceIosUrl: row.deviceIosUrl,
    deviceAndroidUrl: row.deviceAndroidUrl,
    deviceOthersUrl: row.deviceOthersUrl,
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

      return {
        links: rows.map((row) => serializeLinkListItem(row)),
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
          detail: parsed.error.message,
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
          detail: parsed.error.message,
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
          expiresAt,
        })
        .returning();

      if (parsed.data.domainIds) {
        await replaceLinkDomainBindings(linkId, parsed.data.domainIds);
      }

      await invalidateCachedLink(parsed.data.slug);

      const domainIds = await loadLinkDomainIds(linkId);
      return serializeLinkDetail(row, domainIds);
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
          detail: parsed.error.message,
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

      console.info('[LinkDomainVerify] verify requested', {
        domainId: row.id,
        hostname: row.hostname,
        appId: query.appId,
      });

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
      return serializeLinkDetail(row, domainIds);
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
          detail: parsed.error.message,
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

      if (parsed.data.domainIds) {
        await replaceLinkDomainBindings(params.linkId, parsed.data.domainIds);
      }

      await invalidateCachedLink(existing.slug);
      if (row.slug !== existing.slug) {
        await invalidateCachedLink(row.slug);
      }

      const domainIds = await loadLinkDomainIds(row.id);
      return serializeLinkDetail(row, domainIds);
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
