import {
  ErrorCode,
  ErrorResponseSchema,
  HttpStatus,
  PublicApiCapabilitiesResponseSchema,
} from '@phase/shared';
import { Elysia, t } from 'elysia';
import { publicApiAuthPlugin } from '@/lib/public-api-auth';
import { getPublicApiCapabilities } from '@/lib/public-api-capabilities';

export const publicApiMetaRouter = new Elysia({ prefix: '/v1/apps/:appId' })
  .use(publicApiAuthPlugin)
  .get(
    '/capabilities',
    ({ params, set }) => {
      try {
        set.status = HttpStatus.OK;
        return getPublicApiCapabilities(params.appId);
      } catch (error) {
        console.error('[PublicAPI.Capabilities] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch public API capabilities',
        };
      }
    },
    {
      params: t.Object({ appId: t.String() }),
      response: {
        200: PublicApiCapabilitiesResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  );
