import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { and, eq, isNull } from 'drizzle-orm';
import { db, sessions } from '@/db';
import { validateSession } from '@/lib/validators';
import {
  ErrorCode,
  errorResponses,
  HttpStatus,
  pingSessionRequestSchema,
  pingSessionResponseSchema,
} from '@/schemas';

const pingSessionRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['ping'],
  description: 'Ping/Heartbeat for active session',
  request: {
    body: {
      content: {
        'application/json': {
          schema: pingSessionRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Session pinged successfully',
      content: {
        'application/json': {
          schema: pingSessionResponseSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const pingRouter = new OpenAPIHono();

pingRouter.openapi(pingSessionRoute, async (c) => {
  try {
    const body = c.req.valid('json');

    const sessionValidation = await validateSession(c, body.sessionId);
    if (!sessionValidation.success) {
      return sessionValidation.response;
    }

    const session = sessionValidation.data;

    if (session.endedAt) {
      return c.json(
        {
          code: ErrorCode.VALIDATION_ERROR,
          detail: 'Cannot ping an ended session',
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const currentTimestamp = new Date();

    await db.transaction(async (tx) => {
      const currentSession = await tx.query.sessions.findFirst({
        where: (table, { eq: eqFn }) => eqFn(table.sessionId, body.sessionId),
      });

      if (!currentSession) {
        throw new Error('Session not found');
      }

      if (currentSession.endedAt) {
        throw new Error('Cannot ping an ended session');
      }

      const timeSinceLastActivity =
        currentTimestamp.getTime() - currentSession.lastActivityAt.getTime();

      if (timeSinceLastActivity > 10 * 60 * 1000) {
        await tx
          .update(sessions)
          .set({
            endedAt: currentSession.lastActivityAt,
          })
          .where(eq(sessions.sessionId, body.sessionId));
        throw new Error('Session expired. Please create a new session.');
      }

      await tx
        .update(sessions)
        .set({
          lastActivityAt: currentTimestamp,
        })
        .where(
          and(eq(sessions.sessionId, body.sessionId), isNull(sessions.endedAt))
        );
    });

    return c.json(
      {
        sessionId: body.sessionId,
        lastActivityAt: currentTimestamp.toISOString(),
      },
      HttpStatus.OK
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to ping session';

    if (
      errorMessage.includes('Session expired') ||
      errorMessage.includes('not found') ||
      errorMessage.includes('ended session')
    ) {
      return c.json(
        {
          code: ErrorCode.VALIDATION_ERROR,
          detail: errorMessage,
        },
        HttpStatus.BAD_REQUEST
      );
    }

    console.error('[Session.Ping] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to ping session',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

export default pingRouter;
