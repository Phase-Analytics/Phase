import { randomUUID } from 'node:crypto';
import {
  CreateLinkRequestSchema,
  ErrorCode,
  ErrorResponseSchema,
  formatZodError,
  HttpStatus,
  LinkDetailSchema,
  LinkSlugSchema,
  LinksListResponseSchema,
  SlugAvailableResponseSchema,
  UpdateLinkRequestSchema,
} from '@phase/shared';
import { and, desc, eq } from 'drizzle-orm';
import { t } from 'elysia';
import { db, linkDomains, links } from '@/db';
import { invalidateCachedLink } from '@/lib/links/cache';
import {
  deleteLinkClickTotals,
  getLinkClickTotals,
} from '@/lib/links/click-totals';
import {
  assertAllowedLinkDestinations,
  LinkDestinationError,
} from '@/lib/links/destination-policy';
import {
  buildLinkDetail,
  findAppLink,
  getPolicyIdForLink,
  type LinkRow,
  loadDomainsByIdForApp,
  serializeLinkDetail,
  serializeLinkListItem,
} from '@/lib/links/serialize';
import { isLinkSlugAvailable, tombstoneDefaultSlugs } from '@/lib/links/slugs';
import { resolvePrimaryShortUrl } from '@/lib/links/urls';
import { deleteR2ObjectByPublicUrl } from '@/lib/r2';
import {
  authorizeLinkApp,
  createLinksRouter,
  type LinksAuthContext,
  linkNotFound,
  respondError,
} from './context';

type StatusSetter = { status?: number | string };

const SLUG_TAKEN = 'This path is already taken on the selected domain';

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}

function validationError(set: StatusSetter, detail: string) {
  return respondError(
    set,
    HttpStatus.BAD_REQUEST,
    ErrorCode.VALIDATION_ERROR,
    detail
  );
}

function slugTaken(set: StatusSetter) {
  return respondError(set, HttpStatus.CONFLICT, ErrorCode.CONFLICT, SLUG_TAKEN);
}

function findAppDomain(appId: string, domainId: string, verifiedOnly: boolean) {
  return db.query.linkDomains.findFirst({
    where: and(
      eq(linkDomains.id, domainId),
      eq(linkDomains.appId, appId),
      ...(verifiedOnly ? [eq(linkDomains.status, 'verified')] : [])
    ),
    columns: { id: true },
  });
}

/** Returns an error body when a destination violates the abuse policy. */
async function checkDestinations(
  set: StatusSetter,
  urls: Array<string | null | undefined>
) {
  try {
    await assertAllowedLinkDestinations(urls);
    return null;
  } catch (error) {
    if (error instanceof LinkDestinationError) {
      return validationError(set, error.message);
    }
    throw error;
  }
}

function changed<T>(next: T | undefined, current: T): T | undefined {
  return next !== undefined && next !== current ? next : undefined;
}

/** Best-effort cleanup of resources that live outside Postgres. */
function releaseDeletedLink(row: LinkRow): void {
  deleteR2ObjectByPublicUrl(row.ogImageUrl).catch((error) => {
    console.error(`[Links] Failed to delete OG image for ${row.id}:`, error);
  });
  // Never rejects: Redis failures are logged inside.
  deleteLinkClickTotals([row.id]);
}

export const linkCrudRouter = createLinksRouter()
  .get(
    '/',
    async (ctx) => {
      const { query, user, set } = ctx as typeof ctx & LinksAuthContext;
      const denied = await authorizeLinkApp(user, query.appId, set);
      if (denied) {
        return denied;
      }

      const [rows, domainsById] = await Promise.all([
        db
          .select()
          .from(links)
          .where(eq(links.appId, query.appId))
          .orderBy(desc(links.createdAt)),
        loadDomainsByIdForApp(query.appId),
      ]);

      // Totals are omitted (not zeroed) when they cannot be loaded.
      let clickTotals: Map<string, number> | null = null;
      try {
        clickTotals = await getLinkClickTotals(
          query.appId,
          rows.map((row) => row.id)
        );
      } catch (error) {
        console.error('[Links] Click totals unavailable:', error);
      }

      return {
        links: rows.map((row) =>
          serializeLinkListItem(row, {
            shortUrl: resolvePrimaryShortUrl(
              row.slug,
              row.domainId,
              domainsById
            ),
            totalClicks: clickTotals?.get(row.id),
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
      const { query, user, set } = ctx as typeof ctx & LinksAuthContext;
      const parsed = LinkSlugSchema.safeParse(query.slug);
      if (!parsed.success) {
        return validationError(set, formatZodError(parsed.error));
      }

      const denied = await authorizeLinkApp(user, query.appId, set);
      if (denied) {
        return denied;
      }

      const domainId = query.domainId || null;
      if (domainId && !(await findAppDomain(query.appId, domainId, false))) {
        return validationError(set, 'Select a verified domain from this app');
      }

      return {
        available: await isLinkSlugAvailable({
          slug: parsed.data,
          domainId,
          appId: query.appId,
          excludeLinkId: query.excludeLinkId,
        }),
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
      const { body, user, set } = ctx as typeof ctx & LinksAuthContext;
      const parsed = CreateLinkRequestSchema.safeParse(body);
      if (!parsed.success) {
        return validationError(set, formatZodError(parsed.error));
      }
      const input = parsed.data;

      const denied = await authorizeLinkApp(user, input.appId, set);
      if (denied) {
        return denied;
      }

      const domainId = input.domainId ?? null;
      if (domainId && !(await findAppDomain(input.appId, domainId, true))) {
        return validationError(set, 'Select a verified domain from this app');
      }

      const blocked = await checkDestinations(set, [
        input.destinationUrl,
        input.deviceIosUrl,
        input.deviceAndroidUrl,
        input.deviceOthersUrl,
      ]);
      if (blocked) {
        return blocked;
      }

      const slugCheck = { slug: input.slug, domainId, appId: input.appId };
      if (!(await isLinkSlugAvailable(slugCheck))) {
        return slugTaken(set);
      }

      let row: LinkRow;
      try {
        [row] = await db
          .insert(links)
          .values({
            id: randomUUID(),
            appId: input.appId,
            domainId,
            name: input.name?.trim() || null,
            slug: input.slug,
            destinationUrl: input.destinationUrl,
            utmSource: input.utmSource ?? null,
            utmMedium: input.utmMedium ?? null,
            utmCampaign: input.utmCampaign ?? null,
            utmTerm: input.utmTerm ?? null,
            utmContent: input.utmContent ?? null,
            deviceIosUrl: input.deviceIosUrl ?? null,
            deviceAndroidUrl: input.deviceAndroidUrl ?? null,
            deviceOthersUrl: input.deviceOthersUrl ?? null,
            ogTitle: input.ogTitle ?? null,
            ogDescription: input.ogDescription ?? null,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            disabledAt: input.disabled ? new Date() : null,
          })
          .returning();
      } catch (error) {
        if (isUniqueViolation(error)) {
          return slugTaken(set);
        }
        throw error;
      }

      // Drops a cached "missing" entry for this slug.
      await invalidateCachedLink(row.slug, row.domainId);
      return buildLinkDetail(row);
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
    '/:linkId',
    async (ctx) => {
      const { params, query, user, set } = ctx as typeof ctx & LinksAuthContext;
      const denied = await authorizeLinkApp(user, query.appId, set);
      if (denied) {
        return denied;
      }

      const row = await findAppLink(query.appId, params.linkId);
      return row ? buildLinkDetail(row) : linkNotFound(set);
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
        LinksAuthContext;
      const parsed = UpdateLinkRequestSchema.safeParse(body);
      if (!parsed.success) {
        return validationError(set, formatZodError(parsed.error));
      }
      const input = parsed.data;

      const denied = await authorizeLinkApp(user, query.appId, set);
      if (denied) {
        return denied;
      }

      const existing = await findAppLink(query.appId, params.linkId);
      if (!existing) {
        return linkNotFound(set);
      }

      const destinationUrl = changed(
        input.destinationUrl,
        existing.destinationUrl
      );
      const deviceIosUrl = changed(input.deviceIosUrl, existing.deviceIosUrl);
      const deviceAndroidUrl = changed(
        input.deviceAndroidUrl,
        existing.deviceAndroidUrl
      );
      const deviceOthersUrl = changed(
        input.deviceOthersUrl,
        existing.deviceOthersUrl
      );

      const policyId = await getPolicyIdForLink(existing.id);
      if (policyId && destinationUrl !== undefined) {
        return validationError(
          set,
          'Destination is managed by the linked policy'
        );
      }
      if (
        policyId &&
        (deviceIosUrl !== undefined ||
          deviceAndroidUrl !== undefined ||
          deviceOthersUrl !== undefined)
      ) {
        return validationError(
          set,
          'Device routing is managed by the linked policy'
        );
      }

      const nextSlug = input.slug ?? existing.slug;
      const nextDomainId =
        input.domainId === undefined ? existing.domainId : input.domainId;

      if (
        nextDomainId &&
        !(await findAppDomain(
          existing.appId,
          nextDomainId,
          nextDomainId !== existing.domainId
        ))
      ) {
        return validationError(set, 'Select a verified domain from this app');
      }

      const blocked = await checkDestinations(set, [
        destinationUrl,
        deviceIosUrl,
        deviceAndroidUrl,
        deviceOthersUrl,
      ]);
      if (blocked) {
        return blocked;
      }

      const movesSlug =
        nextSlug !== existing.slug || nextDomainId !== existing.domainId;
      if (
        movesSlug &&
        !(await isLinkSlugAvailable({
          slug: nextSlug,
          domainId: nextDomainId,
          appId: existing.appId,
          excludeLinkId: existing.id,
        }))
      ) {
        return slugTaken(set);
      }

      const textFields = {
        utmSource: input.utmSource,
        utmMedium: input.utmMedium,
        utmCampaign: input.utmCampaign,
        utmTerm: input.utmTerm,
        utmContent: input.utmContent,
        ogTitle: input.ogTitle,
        ogDescription: input.ogDescription,
      };
      const providedTextFields = Object.fromEntries(
        Object.entries(textFields).filter(([, value]) => value !== undefined)
      ) as Partial<Record<keyof typeof textFields, string | null>>;

      let row: LinkRow;
      try {
        row = await db.transaction(async (tx) => {
          const [updated] = await tx
            .update(links)
            .set({
              ...(input.name === undefined
                ? {}
                : { name: input.name?.trim() || null }),
              slug: nextSlug,
              domainId: nextDomainId,
              ...(destinationUrl === undefined ? {} : { destinationUrl }),
              ...(deviceIosUrl === undefined ? {} : { deviceIosUrl }),
              ...(deviceAndroidUrl === undefined ? {} : { deviceAndroidUrl }),
              ...(deviceOthersUrl === undefined ? {} : { deviceOthersUrl }),
              ...providedTextFields,
              ...(input.expiresAt === undefined
                ? {}
                : {
                    expiresAt: input.expiresAt
                      ? new Date(input.expiresAt)
                      : null,
                  }),
              ...(input.disabled === undefined
                ? {}
                : { disabledAt: input.disabled ? new Date() : null }),
            })
            .where(eq(links.id, existing.id))
            .returning();

          if (movesSlug && existing.domainId === null) {
            await tombstoneDefaultSlugs(tx, existing.appId, [existing.slug]);
          }
          return updated;
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          return slugTaken(set);
        }
        throw error;
      }

      await invalidateCachedLink(existing.slug, existing.domainId);
      if (movesSlug) {
        await invalidateCachedLink(row.slug, row.domainId);
      }

      const domainsById = await loadDomainsByIdForApp(existing.appId);
      return serializeLinkDetail(row, domainsById, policyId);
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
      const { params, query, user, set } = ctx as typeof ctx & LinksAuthContext;
      const denied = await authorizeLinkApp(user, query.appId, set);
      if (denied) {
        return denied;
      }

      const existing = await findAppLink(query.appId, params.linkId);
      if (!existing) {
        return linkNotFound(set);
      }

      if (await getPolicyIdForLink(existing.id)) {
        return respondError(
          set,
          HttpStatus.CONFLICT,
          ErrorCode.CONFLICT,
          'Delete the linked policy instead'
        );
      }

      await db.transaction(async (tx) => {
        await tx.delete(links).where(eq(links.id, existing.id));
        if (existing.domainId === null) {
          await tombstoneDefaultSlugs(tx, existing.appId, [existing.slug]);
        }
      });
      await invalidateCachedLink(existing.slug, existing.domainId);
      releaseDeletedLink(existing);

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
  );
