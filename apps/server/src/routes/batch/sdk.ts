import {
  BatchRequestSchema,
  BatchResponseSchema,
  ErrorResponseSchema,
  HttpStatus,
} from '@phase/shared';
import { Elysia } from 'elysia';
import { processBatch } from '@/lib/batch-processor';
import { gzipDecompressionPlugin } from '@/lib/gzip-middleware';
import { sdkAuthPlugin } from '@/lib/middleware';

function getClientIP(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    ''
  );
}

export const batchSdkRouter = new Elysia({ prefix: '/batch' })
  .use(gzipDecompressionPlugin)
  .use(sdkAuthPlugin)
  .post(
    '/',
    async ({ body, app, request, set }) => {
      try {
        const ip = getClientIP(request);
        const result = await processBatch(body.items, app.id, ip);

        if (result.failed > 0 && result.processed === 0) {
          set.status = HttpStatus.BAD_REQUEST;
        } else if (result.failed > 0) {
          set.status = 207;
        } else {
          set.status = HttpStatus.OK;
        }

        return result;
      } catch (error) {
        console.error('[Batch.Process] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          processed: 0,
          failed: body.items.length,
          errors: [
            {
              clientOrder: -1,
              code: 'INTERNAL_SERVER_ERROR',
              detail: 'Failed to process batch',
            },
          ],
          results: [],
        };
      }
    },
    {
      body: BatchRequestSchema,
      response: {
        200: BatchResponseSchema,
        207: BatchResponseSchema,
        400: BatchResponseSchema,
        401: ErrorResponseSchema,
        500: BatchResponseSchema,
      },
    }
  );
