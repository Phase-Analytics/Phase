import { randomUUID } from 'node:crypto';
import {
  CreatePolicyRequestSchema,
  ErrorCode,
  ErrorResponseSchema,
  formatZodError,
  HttpStatus,
  LinkSlugSchema,
  PoliciesListResponseSchema,
  PolicyDetailSchema,
  PolicySlugAvailableResponseSchema,
  UpdatePolicyRequestSchema,
} from '@phase/shared';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { db, linkDomains, links, policies } from '@/db';
import { auth } from '@/lib/auth';
import { assertAppAccess } from '@/lib/links/access';
import { getLinkClickTotalsByApp } from '@/lib/links/analytics';
import { invalidateCachedLink } from '@/lib/links/cache';
import { resolvePrimaryShortUrl } from '@/lib/links/urls';
import {
  authPlugin,
  type BetterAuthSession,
  type BetterAuthUser,
} from '@/lib/middleware';
import { buildPolicyDestinationUrl } from '@/lib/policies/urls';

type AuthContext = { user: BetterAuthUser; session: BetterAuthSession };

type DomainLookup = Map<string, { hostname: string; status: string }>;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}

function formatPolicyDate(value: string | Date): string {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

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

async function isLinkSlugAvailable(
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

function serializePolicy(
  policy: typeof policies.$inferSelect,
  link: typeof links.$inferSelect,
  domainsById: DomainLookup,
  totalClicks?: number
) {
  const publicUrl = resolvePrimaryShortUrl(
    link.slug,
    link.domainId,
    domainsById
  );

  return {
    id: policy.id,
    linkId: policy.linkId,
    appId: policy.appId,
    name: policy.name,
    slug: link.slug,
    domainId: link.domainId,
    date: formatPolicyDate(policy.date),
    publicUrl,
    content: policy.content,
    createdAt: policy.createdAt.toISOString(),
    updatedAt: policy.updatedAt.toISOString(),
    ...(totalClicks !== undefined ? { totalClicks } : {}),
  };
}

function serializePolicyListItem(
  policy: typeof policies.$inferSelect,
  link: typeof links.$inferSelect,
  domainsById: DomainLookup,
  totalClicks?: number
) {
  const {
    content: _content,
    appId: _appId,
    ...item
  } = serializePolicy(policy, link, domainsById, totalClicks);
  return item;
}

export const policiesWebRouter = new Elysia({ prefix: '/policies' })
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
        .select({
          policy: policies,
          link: links,
        })
        .from(policies)
        .innerJoin(links, eq(policies.linkId, links.id))
        .where(eq(policies.appId, query.appId))
        .orderBy(desc(policies.createdAt));

      const domainsById = await loadDomainsByIdForApp(query.appId);
      const clickTotals = await getLinkClickTotalsByApp(query.appId);

      return {
        policies: rows.map(({ policy, link }) =>
          serializePolicyListItem(
            policy,
            link,
            domainsById,
            clickTotals.get(link.id) ?? 0
          )
        ),
      };
    },
    {
      query: t.Object({ appId: t.String() }),
      response: {
        200: PoliciesListResponseSchema,
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

      const parsed = LinkSlugSchema.safeParse(query.slug);
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

      let excludeLinkId = query.excludeLinkId;
      if (!excludeLinkId && query.excludePolicyId) {
        const policy = await db.query.policies.findFirst({
          where: and(
            eq(policies.id, query.excludePolicyId),
            eq(policies.appId, query.appId)
          ),
          columns: { linkId: true },
        });
        excludeLinkId = policy?.linkId;
      }

      return {
        available: await isLinkSlugAvailable(
          parsed.data,
          domainId,
          excludeLinkId
        ),
      };
    },
    {
      query: t.Object({
        appId: t.String(),
        slug: t.String(),
        domainId: t.Optional(t.String()),
        excludeLinkId: t.Optional(t.String()),
        excludePolicyId: t.Optional(t.String()),
      }),
      response: {
        200: PolicySlugAvailableResponseSchema,
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

      const parsed = CreatePolicyRequestSchema.safeParse(body);
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

      if (!(await isLinkSlugAvailable(parsed.data.slug, domainId))) {
        set.status = HttpStatus.CONFLICT;
        return {
          code: ErrorCode.CONFLICT,
          detail: 'This path is already taken on the selected domain',
        };
      }

      const policyId = randomUUID();
      const linkId = randomUUID();
      const destinationUrl = buildPolicyDestinationUrl(policyId);

      let policyRow: typeof policies.$inferSelect;
      let linkRow: typeof links.$inferSelect;

      try {
        const result = await db.transaction(async (tx) => {
          const [createdLink] = await tx
            .insert(links)
            .values({
              id: linkId,
              appId: parsed.data.appId,
              domainId,
              name: parsed.data.name,
              slug: parsed.data.slug,
              destinationUrl,
            })
            .returning();

          const [createdPolicy] = await tx
            .insert(policies)
            .values({
              id: policyId,
              appId: parsed.data.appId,
              linkId,
              name: parsed.data.name,
              date: parsed.data.date,
              content: parsed.data.content,
            })
            .returning();

          return { createdLink, createdPolicy };
        });

        policyRow = result.createdPolicy;
        linkRow = result.createdLink;
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

      await invalidateCachedLink(linkRow.slug, linkRow.domainId);

      const domainsById = await loadDomainsByIdForApp(parsed.data.appId);
      return serializePolicy(policyRow, linkRow, domainsById);
    },
    {
      response: {
        200: PolicyDetailSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        409: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/:policyId',
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

      const row = await db
        .select({
          policy: policies,
          link: links,
        })
        .from(policies)
        .innerJoin(links, eq(policies.linkId, links.id))
        .where(
          and(eq(policies.id, params.policyId), eq(policies.appId, query.appId))
        )
        .limit(1);

      const match = row[0];
      if (!match) {
        set.status = HttpStatus.NOT_FOUND;
        return { code: ErrorCode.NOT_FOUND, detail: 'Policy not found' };
      }

      const domainsById = await loadDomainsByIdForApp(query.appId);
      return serializePolicy(match.policy, match.link, domainsById);
    },
    {
      params: t.Object({ policyId: t.String() }),
      query: t.Object({ appId: t.String() }),
      response: {
        200: PolicyDetailSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    }
  )
  .patch(
    '/:policyId',
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

      const parsed = UpdatePolicyRequestSchema.safeParse(body);
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

      const existingRows = await db
        .select({
          policy: policies,
          link: links,
        })
        .from(policies)
        .innerJoin(links, eq(policies.linkId, links.id))
        .where(
          and(eq(policies.id, params.policyId), eq(policies.appId, query.appId))
        )
        .limit(1);

      const existing = existingRows[0];
      if (!existing) {
        set.status = HttpStatus.NOT_FOUND;
        return { code: ErrorCode.NOT_FOUND, detail: 'Policy not found' };
      }

      const nextSlug = parsed.data.slug ?? existing.link.slug;
      const nextDomainId =
        parsed.data.domainId !== undefined
          ? parsed.data.domainId
          : existing.link.domainId;

      if (nextDomainId) {
        const domain = await loadDomainForApp(
          nextDomainId,
          existing.policy.appId,
          nextDomainId !== existing.link.domainId
        );
        if (!domain) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'Select a verified domain from this app',
          };
        }
      }

      if (
        (nextSlug !== existing.link.slug ||
          nextDomainId !== existing.link.domainId) &&
        !(await isLinkSlugAvailable(nextSlug, nextDomainId, existing.link.id))
      ) {
        set.status = HttpStatus.CONFLICT;
        return {
          code: ErrorCode.CONFLICT,
          detail: 'This path is already taken on the selected domain',
        };
      }

      const nextName = parsed.data.name ?? existing.policy.name;
      const destinationUrl = buildPolicyDestinationUrl(existing.policy.id);

      let policyRow: typeof policies.$inferSelect;
      let linkRow: typeof links.$inferSelect;

      try {
        const result = await db.transaction(async (tx) => {
          const [updatedLink] = await tx
            .update(links)
            .set({
              name: nextName,
              slug: nextSlug,
              domainId: nextDomainId,
              destinationUrl,
            })
            .where(eq(links.id, existing.link.id))
            .returning();

          const [updatedPolicy] = await tx
            .update(policies)
            .set({
              ...(parsed.data.name !== undefined
                ? { name: parsed.data.name }
                : {}),
              ...(parsed.data.date !== undefined
                ? { date: parsed.data.date }
                : {}),
              ...(parsed.data.content !== undefined
                ? { content: parsed.data.content }
                : {}),
            })
            .where(eq(policies.id, existing.policy.id))
            .returning();

          return { updatedLink, updatedPolicy };
        });

        policyRow = result.updatedPolicy;
        linkRow = result.updatedLink;
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

      await invalidateCachedLink(existing.link.slug, existing.link.domainId);
      await invalidateCachedLink(linkRow.slug, linkRow.domainId);

      const domainsById = await loadDomainsByIdForApp(query.appId);
      return serializePolicy(policyRow, linkRow, domainsById);
    },
    {
      params: t.Object({ policyId: t.String() }),
      query: t.Object({ appId: t.String() }),
      response: {
        200: PolicyDetailSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        409: ErrorResponseSchema,
      },
    }
  )
  .delete(
    '/:policyId',
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

      const existingRows = await db
        .select({
          policy: policies,
          link: links,
        })
        .from(policies)
        .innerJoin(links, eq(policies.linkId, links.id))
        .where(
          and(eq(policies.id, params.policyId), eq(policies.appId, query.appId))
        )
        .limit(1);

      const existing = existingRows[0];
      if (!existing) {
        set.status = HttpStatus.NOT_FOUND;
        return { code: ErrorCode.NOT_FOUND, detail: 'Policy not found' };
      }

      await db.transaction(async (tx) => {
        await tx.delete(policies).where(eq(policies.id, existing.policy.id));
        await tx.delete(links).where(eq(links.id, existing.link.id));
      });

      await invalidateCachedLink(existing.link.slug, existing.link.domainId);

      return { success: true };
    },
    {
      params: t.Object({ policyId: t.String() }),
      query: t.Object({ appId: t.String() }),
      response: {
        200: t.Object({ success: t.Boolean() }),
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    }
  );
