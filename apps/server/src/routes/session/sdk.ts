import {
  CreateSessionRequestSchema,
  ErrorCode,
  ErrorResponseSchema,
  HttpStatus,
  SessionSchema,
} from '@phase/shared';
import { Elysia } from 'elysia';
import { db, sessions } from '@/db';
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

        const existingSession = await db.query.sessions.findFirst({
          where: (table, { eq: eqFn }) => eqFn(table.sessionId, body.sessionId),
        });

        if (existingSession) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'Session with this ID already exists',
          };
        }

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

        const clientStartedAt = timestampValidation.data;

        const [newSession] = await db
          .insert(sessions)
          .values({
            sessionId: body.sessionId,
            deviceId: body.deviceId,
            startedAt: clientStartedAt,
            lastActivityAt: clientStartedAt,
          })
          .returning();

        sseManager.pushSession(device.appId, {
          sessionId: newSession.sessionId,
          deviceId: newSession.deviceId,
          startedAt: newSession.startedAt.toISOString(),
          country: device.country,
          platform: device.platform,
        });

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
