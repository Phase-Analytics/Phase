import {
  ErrorCode,
  ErrorResponseSchema,
  HttpStatus,
  LINK_OG_IMAGE,
  LinkDetailSchema,
} from '@phase/shared';
import { eq } from 'drizzle-orm';
import { t } from 'elysia';
import { db, links } from '@/db';
import { invalidateCachedLink } from '@/lib/links/cache';
import {
  LinkOgImageError,
  processLinkOgImage,
} from '@/lib/links/link-og-image';
import { buildLinkDetail, findAppLink } from '@/lib/links/serialize';
import {
  buildLinkOgObjectKey,
  deleteR2ObjectByPublicUrl,
  extractR2ObjectKeyFromPublicUrl,
  getR2Config,
  isR2Configured,
  uploadToR2,
} from '@/lib/r2';
import {
  authorizeLinkApp,
  createLinksRouter,
  type LinksAuthContext,
  linkNotFound,
  respondError,
} from './context';

// Multipart boundaries and headers on top of the file itself.
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;
const MAX_REQUEST_BYTES =
  LINK_OG_IMAGE.maxUploadBytes + MULTIPART_OVERHEAD_BYTES;
const TOO_LARGE_MESSAGE = `Image must be ${Math.round(LINK_OG_IMAGE.maxUploadBytes / (1024 * 1024))}MB or smaller`;

function objectKeyOf(publicUrl: string | null): string | null {
  const config = getR2Config();
  return publicUrl && config
    ? extractR2ObjectKeyFromPublicUrl(publicUrl, config)
    : null;
}

export const linkOgImageRouter = createLinksRouter()
  .post(
    '/:linkId/og-image',
    async (ctx) => {
      const { params, query, user, set, request } = ctx as typeof ctx &
        LinksAuthContext;

      // Reject oversized bodies before buffering them into formData().
      const contentLength = Number(request.headers.get('content-length'));
      if (!(Number.isFinite(contentLength) && contentLength > 0)) {
        return respondError(
          set,
          411,
          ErrorCode.BAD_REQUEST,
          'Content-Length is required'
        );
      }
      if (contentLength > MAX_REQUEST_BYTES) {
        return respondError(
          set,
          413,
          ErrorCode.VALIDATION_ERROR,
          TOO_LARGE_MESSAGE
        );
      }

      if (!isR2Configured()) {
        return respondError(
          set,
          503,
          ErrorCode.INTERNAL_SERVER_ERROR,
          'Image uploads are not configured'
        );
      }

      const denied = await authorizeLinkApp(user, query.appId, set);
      if (denied) {
        return denied;
      }

      const existing = await findAppLink(query.appId, params.linkId);
      if (!existing) {
        return linkNotFound(set);
      }

      const file = (await request.formData()).get('file');
      if (!(file instanceof File) || file.size === 0) {
        return respondError(
          set,
          HttpStatus.BAD_REQUEST,
          ErrorCode.VALIDATION_ERROR,
          'Missing image file'
        );
      }

      let processed: Buffer;
      try {
        processed = await processLinkOgImage(
          Buffer.from(await file.arrayBuffer())
        );
      } catch (error) {
        return respondError(
          set,
          HttpStatus.BAD_REQUEST,
          ErrorCode.VALIDATION_ERROR,
          error instanceof LinkOgImageError
            ? error.message
            : 'Invalid image file'
        );
      }

      const objectKey = buildLinkOgObjectKey(existing.appId, existing.id);
      let ogImageUrl: string;
      try {
        // Overwrites the previous image in place; ?v= busts CDN caches.
        const publicUrl = await uploadToR2({
          key: objectKey,
          body: processed,
          contentType: 'image/jpeg',
        });
        ogImageUrl = `${publicUrl}?v=${Date.now()}`;
      } catch (error) {
        console.error('[Links] OG image upload failed:', error);
        return respondError(
          set,
          HttpStatus.INTERNAL_SERVER_ERROR,
          ErrorCode.INTERNAL_SERVER_ERROR,
          'Failed to upload image'
        );
      }

      const [row] = await db
        .update(links)
        .set({ ogImageUrl })
        .where(eq(links.id, existing.id))
        .returning();
      await invalidateCachedLink(existing.slug, existing.domainId);

      // Images stored under an older key scheme are no longer referenced.
      if (objectKeyOf(existing.ogImageUrl) !== objectKey) {
        deleteR2ObjectByPublicUrl(existing.ogImageUrl).catch((error) => {
          console.error('[Links] Failed to delete previous OG image:', error);
        });
      }

      return buildLinkDetail(row);
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
        411: ErrorResponseSchema,
        413: ErrorResponseSchema,
        500: ErrorResponseSchema,
        503: ErrorResponseSchema,
      },
    }
  )
  .delete(
    '/:linkId/og-image',
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

      const [row] = await db
        .update(links)
        .set({ ogImageUrl: null })
        .where(eq(links.id, existing.id))
        .returning();
      await invalidateCachedLink(existing.slug, existing.domainId);

      deleteR2ObjectByPublicUrl(existing.ogImageUrl).catch((error) => {
        console.error('[Links] Failed to delete OG image:', error);
      });

      return buildLinkDetail(row);
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
  );
