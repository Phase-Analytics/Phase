import {
  ErrorCode,
  ErrorResponseSchema,
  HttpStatus,
  PublicApiQueryRequestSchema,
  PublicApiQueryResponseSchema,
} from '@phase/shared';
import { Elysia } from 'elysia';
import { ExploreEngineError, runExploreQuery } from '@/lib/explore';
import { publicApiAuthPlugin } from '@/lib/public-api-auth';
import {
  getPublicApiMeta,
  PUBLIC_API_MAX_RAW_PAGE_SIZE,
} from '@/lib/public-api-capabilities';
import { checkPublicApiRateLimit } from '@/lib/rate-limit';

export const publicApiQueryRouter = new Elysia({
  prefix: '/v1/apps/:appId/query',
})
  .use(publicApiAuthPlugin)
  .post(
    '/',
    async ({ body, params, set, request, store }) => {
      const token = store.publicApiToken;
      if (!token) {
        set.status = HttpStatus.UNAUTHORIZED;
        return {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'Authentication required',
        };
      }

      const rateLimit = await checkPublicApiRateLimit(
        token.id,
        request.headers.get('x-forwarded-for') ??
          request.headers.get('x-real-ip') ??
          undefined
      );
      if (!rateLimit.allowed) {
        set.status = HttpStatus.TOO_MANY_REQUESTS;
        return {
          code: ErrorCode.TOO_MANY_REQUESTS,
          detail: rateLimit.reason ?? 'Too many query requests',
        };
      }

      const parsed = PublicApiQueryRequestSchema.safeParse(body);
      if (!parsed.success) {
        set.status = HttpStatus.BAD_REQUEST;
        return {
          code: ErrorCode.VALIDATION_ERROR,
          detail: parsed.error.message,
        };
      }

      try {
        const result = await runExploreQuery(
          params.appId,
          { version: 1, sql: parsed.data.sql },
          parsed.data.page,
          { maxPageSize: PUBLIC_API_MAX_RAW_PAGE_SIZE }
        );

        set.status = HttpStatus.OK;
        return {
          result: result.result,
          meta: {
            ...getPublicApiMeta(),
            page: result.meta.page,
            pageSize: result.meta.pageSize,
            offset: result.meta.offset,
            rowCount: result.meta.rowCount,
            hasNextPage: result.meta.hasNextPage,
            hasPreviousPage: result.meta.hasPreviousPage,
            executionMs: result.meta.executionMs,
            appliedDateRange: result.meta.appliedDateRange ?? null,
          },
        };
      } catch (error) {
        if (error instanceof ExploreEngineError) {
          set.status = error.statusCode;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: error.message,
          };
        }
        console.error('[PublicAPI.Query] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to run query',
        };
      }
    },
    {
      body: PublicApiQueryRequestSchema,
      response: {
        200: PublicApiQueryResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        429: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  );
