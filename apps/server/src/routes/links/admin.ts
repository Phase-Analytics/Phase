import {
  ErrorCode,
  ErrorResponseSchema,
  formatZodError,
  HttpStatus,
  LinkBanRequestSchema,
} from '@phase/shared';
import { eq } from 'drizzle-orm';
import { t } from 'elysia';
import { db, links } from '@/db';
import { invalidateCachedLink } from '@/lib/links/cache';
import { ADMIN_USER_ID } from '@/lib/middleware';
import {
  createLinksRouter,
  type LinksAuthContext,
  linkNotFound,
  respondError,
} from './context';

/**
 * Staff-only abuse switch. A banned link answers 410 on every host regardless
 * of owner settings; owners cannot clear it.
 */
export const linkAdminRouter = createLinksRouter().patch(
  '/admin/:linkId/ban',
  async (ctx) => {
    const { params, body, set, user } = ctx as typeof ctx & LinksAuthContext;
    if (!user?.id) {
      return respondError(
        set,
        HttpStatus.UNAUTHORIZED,
        ErrorCode.UNAUTHORIZED,
        'Authentication required'
      );
    }
    if (user.id !== ADMIN_USER_ID) {
      return respondError(
        set,
        HttpStatus.FORBIDDEN,
        ErrorCode.FORBIDDEN,
        'Admin access required'
      );
    }

    const parsed = LinkBanRequestSchema.safeParse(body);
    if (!parsed.success) {
      return respondError(
        set,
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        formatZodError(parsed.error)
      );
    }

    const [row] = await db
      .update(links)
      .set({ banned: parsed.data.banned })
      .where(eq(links.id, params.linkId))
      .returning({
        id: links.id,
        slug: links.slug,
        domainId: links.domainId,
        banned: links.banned,
      });
    if (!row) {
      return linkNotFound(set);
    }

    await invalidateCachedLink(row.slug, row.domainId);
    return { id: row.id, banned: row.banned };
  },
  {
    requireAdmin: true,
    params: t.Object({ linkId: t.String() }),
    response: {
      200: t.Object({ id: t.String(), banned: t.Boolean() }),
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
    },
  }
);
