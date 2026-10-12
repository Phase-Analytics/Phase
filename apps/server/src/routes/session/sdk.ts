import {
  CreateSessionRequestSchema,
  ErrorCode,
  ErrorResponseSchema,
  HttpStatus,
  SessionSchema,
} from '@phase/shared';
import { Elysia } from 'elysia';
import { rememberSession } from '@/lib/ingest-cache';
import { createSession } from '@/lib/ingest-store';
import { sdkAuthPlugin } from '@/lib/middleware';
import { sseManager } from '@/lib/sse-manager';
import { validateDevice, validateTimestamp } from '@/lib/validators';

export const sessionSdkRouter = new Elysia({ prefix: '/sessions' })
  .use(sdkAuthPlugin)
  .post(
    '/',
    async ({ body, set, app }) => {
      try {
        const deviceValidation = await validateDevice(body.deviceId, app.id);
        if (!deviceValidation.success) {
          set.status = deviceValidation.error.status;
          return {
            code: deviceValidation.error.code,
            detail: deviceValidation.error.detail,
          };
        }

        const device = deviceValidation.data;

        const timestampValidation = validateTimestamp(
          body.startedAt,
          'startedAt'
        );
        if (!timestampValidation.success) {
          set.status = timestampValidation.error.status;
          return {
            code: timestampValidation.error.code,
            detail: timestampValidation.error.detail,
          };
        }

        // An existing session with this id is returned as-is by createSession.
        const result = await createSession({
          sessionId: body.sessionId,
          deviceId: body.deviceId,
          startedAt: timestampValidation.data,
        });
        if (result.status === 'foreign-device') {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'Session ID belongs to another device',
          };
        }

        const { session: newSession, inserted } = result;
        rememberSession({
          sessionId: newSession.sessionId,
          deviceId: newSession.deviceId,
          appId: device.appId,
          startedAt: newSession.startedAt,
          lastActivityAt: newSession.lastActivityAt,
          country: device.country,
          platform: device.platform,
        });

        if (inserted) {
          sseManager.pushSession(device.appId, {
            sessionId: newSession.sessionId,
            deviceId: newSession.deviceId,
            startedAt: newSession.startedAt.toISOString(),
            country: device.country,
            platform: device.platform,
          });
        }

        set.status = HttpStatus.OK;
        return {
          sessionId: newSession.sessionId,
          deviceId: newSession.deviceId,
          startedAt: newSession.startedAt.toISOString(),
          lastActivityAt: newSession.lastActivityAt.toISOString(),
        };
      } catch (error) {
        console.error('[Session.Create] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to create session',
        };
      }
    },
    {
      body: CreateSessionRequestSchema,
      response: {
        200: SessionSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  );
