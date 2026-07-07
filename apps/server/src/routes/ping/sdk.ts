import {
  ErrorCode,
  ErrorResponseSchema,
  HttpStatus,
  PingSessionRequestSchema,
  PingSessionResponseSchema,
} from '@phase/shared';
import { Elysia } from 'elysia';
import { sdkAuthPlugin } from '@/lib/middleware';
import { getSessionActivityBuffer } from '@/lib/session-activity-buffer';
import {
  invalidateSessionCache,
  SESSION_MAX_DURATION_MS,
  validateSession,
  validateTimestamp,
} from '@/lib/validators';

export const pingSdkRouter = new Elysia({ prefix: '/ping' })
  .use(sdkAuthPlugin)
  .post(
    '/',
    async ({ body, app, set }) => {
      try {
        const sessionValidation = await validateSession(body.sessionId, app.id);
        if (!sessionValidation.success) {
          set.status = sessionValidation.error.status;
          return {
            code: sessionValidation.error.code,
            detail: sessionValidation.error.detail,
          };
        }

        const timestampValidation = validateTimestamp(body.timestamp);
        if (!timestampValidation.success) {
          set.status = timestampValidation.error.status;
          return {
            code: timestampValidation.error.code,
            detail: timestampValidation.error.detail,
          };
        }

        const clientTimestamp = timestampValidation.data;
        const { session, device } = sessionValidation.data;

        const oldestRealtimeSession = new Date(
          Date.now() - SESSION_MAX_DURATION_MS
        );
        if (session.startedAt < oldestRealtimeSession) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'Session is too old, please start a new session',
          };
        }

        const timeSinceSessionStart =
          clientTimestamp.getTime() - session.startedAt.getTime();
        if (timeSinceSessionStart > SESSION_MAX_DURATION_MS) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail:
              'Ping timestamp too far from session start (max 2h session duration)',
          };
        }

        const activityBuffer = getSessionActivityBuffer();
        const latestActivity =
          activityBuffer.getLastActivityAt(session.sessionId) ??
          session.lastActivityAt;
        if (clientTimestamp > latestActivity) {
          activityBuffer.push(session.sessionId, clientTimestamp, device.appId);
        }

        await invalidateSessionCache(session.sessionId);

        set.status = HttpStatus.OK;
        return {
          sessionId: body.sessionId,
          lastActivityAt:
            clientTimestamp > latestActivity
              ? clientTimestamp.toISOString()
              : latestActivity.toISOString(),
        };
      } catch (error) {
        console.error('[Session.Ping] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to ping session',
        };
      }
    },
    {
      body: PingSessionRequestSchema,
      response: {
        200: PingSessionResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  );
