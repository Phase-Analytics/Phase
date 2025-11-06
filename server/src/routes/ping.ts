import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { db, sessions } from '@/db';
import type { App } from '@/db/schema';
import { requireAppKey } from '@/lib/middleware';
import { methodNotAllowed } from '@/lib/response';
import {
  invalidateSessionCache,
  validateSession,
  validateTimestamp,
} from '@/lib/validators';
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
  description: 'Heartbeat for active session',
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

const pingSdkRouter = new OpenAPIHono<{
  Variables: {
    app: App;
    userId: string;
  };
}>();

pingSdkRouter.use('*', requireAppKey);

pingSdkRouter.all('*', async (c, next) => {
  const method = c.req.method;
  const allowedMethods = ['POST'];

  if (!allowedMethods.includes(method)) {
    return methodNotAllowed(c, allowedMethods);
  }

  return await next();
});

pingSdkRouter.openapi(pingSessionRoute, async (c) => {
  try {
    const body = c.req.valid('json');
    const app = c.get('app');

    if (!app?.id) {
      return c.json(
        {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'API key is required',
        },
        HttpStatus.UNAUTHORIZED
      );
    }

    const sessionValidation = await validateSession(c, body.sessionId, app.id);
    if (!sessionValidation.success) {
      return sessionValidation.response;
    }

    const timestampValidation = validateTimestamp(c, body.timestamp);
    if (!timestampValidation.success) {
      return timestampValidation.response;
    }

    const clientTimestamp = timestampValidation.data;
    const { session } = sessionValidation.data;

    await db
      .update(sessions)
      .set({ lastActivityAt: clientTimestamp })
      .where(eq(sessions.sessionId, session.sessionId));

    await invalidateSessionCache(session.sessionId);

    return c.json(
      {
        sessionId: body.sessionId,
        lastActivityAt: clientTimestamp.toISOString(),
      },
      HttpStatus.OK
    );
  } catch (error) {
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

export { pingSdkRouter };
