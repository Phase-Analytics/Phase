import { eq } from 'drizzle-orm';
import { Elysia } from 'elysia';
import { ulid } from 'ulid';
import { db, sessions } from '@/db';
import { sdkAuthPlugin } from '@/lib/middleware';
import { writeEvent } from '@/lib/questdb';
import { sseManager } from '@/lib/sse-manager';
import {
  invalidateSessionCache,
  validateEventParams,
  validateSession,
  validateTimestamp,
} from '@/lib/validators';
import {
  CreateEventRequestSchema,
  ErrorCode,
  ErrorResponseSchema,
  EventSchema,
  HttpStatus,
} from '@/schemas';

export const eventSdkRouter = new Elysia({ prefix: '/events' })
  .use(sdkAuthPlugin)
  .post(
    '/',
    async ({ body, set, app }) => {
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

        const paramsValidation = validateEventParams(body.params);
        if (!paramsValidation.success) {
          set.status = paramsValidation.error.status;
          return {
            code: paramsValidation.error.code,
            detail: paramsValidation.error.detail,
          };
        }

        const clientTimestamp = timestampValidation.data;
        const { session, device } = sessionValidation.data;

        if (clientTimestamp < session.startedAt) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'Event timestamp cannot be before session startedAt',
          };
        }

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (session.startedAt < oneDayAgo) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'Session is too old (>24h), please start a new session',
          };
        }

        if (clientTimestamp <= session.lastActivityAt) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'Event timestamp must be after last activity',
          };
        }

        const eventId = ulid();

        await writeEvent({
          eventId,
          sessionId: body.sessionId,
          deviceId: session.deviceId,
          appId: device.appId,
          name: body.name,
          params: body.params ?? null,
          timestamp: clientTimestamp,
        });

        await db
          .update(sessions)
          .set({ lastActivityAt: clientTimestamp })
          .where(eq(sessions.sessionId, session.sessionId));

        await invalidateSessionCache(session.sessionId);

        sseManager.pushEvent(device.appId, {
          eventId,
          deviceId: session.deviceId,
          name: body.name,
          timestamp: clientTimestamp.toISOString(),
        });

        set.status = HttpStatus.OK;
        return {
          eventId,
          sessionId: body.sessionId,
          deviceId: session.deviceId,
          name: body.name,
          params: body.params ?? null,
          timestamp: clientTimestamp.toISOString(),
        };
      } catch (error) {
        console.error('[Event.Create] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to create event',
        };
      }
    },
    {
      body: CreateEventRequestSchema,
      response: {
        200: EventSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  );
