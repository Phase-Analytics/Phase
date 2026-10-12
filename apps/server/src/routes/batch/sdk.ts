import {
  BatchRequestSchema,
  BatchResponseSchema,
  ErrorCode,
  ErrorResponseSchema,
  HttpStatus,
} from '@phase/shared';
import { Elysia } from 'elysia';
import { processBatch } from '@/lib/batch-processor';
import { shouldRejectBatch } from '@/lib/batch-validator';
import { getClientIp, getSocketAddress } from '@/lib/client-ip';
import { gzipDecompressionPlugin } from '@/lib/gzip-middleware';
import { sdkAuthPlugin } from '@/lib/middleware';

const MULTI_STATUS = 207;

export const batchSdkRouter = new Elysia({ prefix: '/batch' })
  .use(gzipDecompressionPlugin)
  .use(sdkAuthPlugin)
  .onError(({ code, error, set }) => {
    // An invalid envelope is a client error the SDK must not retry.
    if (code === 'VALIDATION' || code === 'PARSE') {
      const issue = code === 'VALIDATION' ? error.all[0] : undefined;
      set.status = HttpStatus.BAD_REQUEST;
      return {
        code: ErrorCode.VALIDATION_ERROR,
        detail: issue
          ? `Invalid ${issue.path || 'body'}: ${issue.message}`
          : 'Malformed request body',
      };
    }
  })
  .post(
    '/',
    async ({ body, app, request, server, set, sdkDebugData }) => {
      try {
        const validation = shouldRejectBatch(body.items);

        if (validation.reject) {
          console.warn('[Batch.Rejected]', {
            appId: app.id,
            reason: validation.reason,
          });

          set.status = HttpStatus.FORBIDDEN;
          return {
            processed: 0,
            failed: body.items.length,
            errors: [
              {
                clientOrder: -1,
                code: ErrorCode.FORBIDDEN,
                detail: 'Request rejected',
                retryable: false,
              },
            ],
            results: [],
          };
        }

        const ip = getClientIp(request, getSocketAddress(request, server));
        const result = await processBatch(body.items, app.id, ip, sdkDebugData);

        set.status = result.failed > 0 ? MULTI_STATUS : HttpStatus.OK;
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
              code: ErrorCode.INTERNAL_SERVER_ERROR,
              detail: 'Failed to process batch',
              retryable: true,
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
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: BatchResponseSchema,
        500: BatchResponseSchema,
      },
    }
  );
