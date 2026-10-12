import {
  CreateLinkDomainRequestSchema,
  ErrorCode,
  ErrorResponseSchema,
  formatZodError,
  HttpStatus,
  LinkDomainSchema,
  LinkDomainsListResponseSchema,
} from '@phase/shared';
import { and, eq } from 'drizzle-orm';
import { t } from 'elysia';
import { db, linkDomains } from '@/db';
import {
  createLinkDomain,
  deleteLinkDomain,
  LinkDomainError,
  listLinkDomains,
  serializeLinkDomain,
  verifyLinkDomain,
} from '@/lib/links/domains';
import {
  authorizeLinkApp,
  createLinksRouter,
  type LinksAuthContext,
  respondError,
} from './context';

const DOMAIN_ERROR_STATUS = {
  conflict: HttpStatus.CONFLICT,
  limit: HttpStatus.CONFLICT,
  provider: HttpStatus.INTERNAL_SERVER_ERROR,
} as const;

function domainErrorResponse(
  error: unknown,
  set: { status?: number | string }
) {
  if (!(error instanceof LinkDomainError)) {
    throw error;
  }
  const status = DOMAIN_ERROR_STATUS[error.kind];
  return respondError(
    set,
    status,
    status === HttpStatus.CONFLICT
      ? ErrorCode.CONFLICT
      : ErrorCode.INTERNAL_SERVER_ERROR,
    error.message
  );
}

function findAppDomain(appId: string, domainId: string) {
  return db.query.linkDomains.findFirst({
    where: and(eq(linkDomains.id, domainId), eq(linkDomains.appId, appId)),
  });
}

function domainNotFound(set: { status?: number | string }) {
  return respondError(
    set,
    HttpStatus.NOT_FOUND,
    ErrorCode.NOT_FOUND,
    'Domain not found'
  );
}

export const linkDomainsRouter = createLinksRouter()
  .get(
    '/domains',
    async (ctx) => {
      const { query, user, set } = ctx as typeof ctx & LinksAuthContext;
      const denied = await authorizeLinkApp(user, query.appId, set);
      if (denied) {
        return denied;
      }

      const rows = await listLinkDomains(query.appId);
      return { domains: rows.map(serializeLinkDomain) };
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
      const { body, user, set } = ctx as typeof ctx & LinksAuthContext;
      const parsed = CreateLinkDomainRequestSchema.safeParse(body);
      if (!parsed.success) {
        return respondError(
          set,
          HttpStatus.BAD_REQUEST,
          ErrorCode.VALIDATION_ERROR,
          formatZodError(parsed.error)
        );
      }

      const denied = await authorizeLinkApp(user, parsed.data.appId, set);
      if (denied) {
        return denied;
      }

      try {
        const row = await createLinkDomain(
          parsed.data.appId,
          parsed.data.hostname.toLowerCase()
        );
        return serializeLinkDomain(row);
      } catch (error) {
        return domainErrorResponse(error, set);
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
      const { params, query, user, set } = ctx as typeof ctx & LinksAuthContext;
      const denied = await authorizeLinkApp(user, query.appId, set);
      if (denied) {
        return denied;
      }

      const row = await findAppDomain(query.appId, params.domainId);
      if (!row) {
        return domainNotFound(set);
      }

      try {
        return serializeLinkDomain(await verifyLinkDomain(row));
      } catch (error) {
        return domainErrorResponse(error, set);
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
        409: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .delete(
    '/domains/:domainId',
    async (ctx) => {
      const { params, query, user, set } = ctx as typeof ctx & LinksAuthContext;
      const denied = await authorizeLinkApp(user, query.appId, set);
      if (denied) {
        return denied;
      }

      const row = await findAppDomain(query.appId, params.domainId);
      if (!row) {
        return domainNotFound(set);
      }

      try {
        await deleteLinkDomain(row);
        return { success: true };
      } catch (error) {
        return domainErrorResponse(error, set);
      }
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
  );
