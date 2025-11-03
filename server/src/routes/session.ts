import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { count, desc, eq, type SQL } from 'drizzle-orm';
import { db, devices, sessions } from '@/db';
import type { ApiKey, Session, User } from '@/db/schema';
import {
  requireApiKey,
  requireAuth,
  verifyApiKeyOwnership,
} from '@/lib/middleware';
import { methodNotAllowed } from '@/lib/response';
import {
  buildFilters,
  formatPaginationResponse,
  validateDateRange,
  validateDevice,
  validatePagination,
  validateTimestamp,
} from '@/lib/validators';
import {
  createSessionRequestSchema,
  ErrorCode,
  errorResponses,
  HttpStatus,
  listSessionsQuerySchema,
  sessionSchema,
  sessionsListResponseSchema,
} from '@/schemas';

const createSessionRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['session'],
  description: 'Create a new session',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createSessionRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Session created',
      content: {
        'application/json': {
          schema: sessionSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const getSessionsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['session'],
  description: 'List sessions for a specific device',
  security: [{ CookieAuth: [] }],
  request: {
    query: listSessionsQuerySchema,
  },
  responses: {
    200: {
      description: 'Sessions list',
      content: {
        'application/json': {
          schema: sessionsListResponseSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const sessionSdkRouter = new OpenAPIHono<{
  Variables: {
    apiKey: ApiKey;
    userId: string;
  };
}>();

sessionSdkRouter.use('*', requireApiKey);

sessionSdkRouter.all('*', async (c, next) => {
  const method = c.req.method;
  const allowedMethods = ['POST'];

  if (!allowedMethods.includes(method)) {
    return methodNotAllowed(c, allowedMethods);
  }

  return await next();
});

const sessionWebRouter = new OpenAPIHono<{
  Variables: {
    user: User;
    session: Session;
    apiKey: ApiKey;
  };
}>();

sessionWebRouter.use('*', requireAuth, verifyApiKeyOwnership);

sessionWebRouter.all('*', async (c, next) => {
  const method = c.req.method;
  const allowedMethods = ['GET'];

  if (!allowedMethods.includes(method)) {
    return methodNotAllowed(c, allowedMethods);
  }

  return await next();
});

sessionSdkRouter.openapi(createSessionRoute, async (c) => {
  try {
    const body = c.req.valid('json');
    const apiKey = c.get('apiKey');

    const deviceValidation = await validateDevice(c, body.deviceId, apiKey.id);
    if (!deviceValidation.success) {
      return deviceValidation.response;
    }

    const device = deviceValidation.data;

    if (body.appVersion && device.appVersion !== body.appVersion) {
      await db
        .update(devices)
        .set({ appVersion: body.appVersion })
        .where(eq(devices.deviceId, body.deviceId));
    }

    const existingSession = await db.query.sessions.findFirst({
      where: (table, { eq: eqFn }) => eqFn(table.sessionId, body.sessionId),
    });

    if (existingSession) {
      return c.json(
        {
          code: ErrorCode.VALIDATION_ERROR,
          detail: 'Session with this ID already exists',
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const timestampValidation = validateTimestamp(
      c,
      body.startedAt,
      'startedAt'
    );
    if (!timestampValidation.success) {
      return timestampValidation.response;
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

    return c.json(
      {
        sessionId: newSession.sessionId,
        deviceId: newSession.deviceId,
        startedAt: newSession.startedAt.toISOString(),
        lastActivityAt: newSession.lastActivityAt.toISOString(),
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[Session.Create] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to create session',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

sessionWebRouter.openapi(getSessionsRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const { deviceId, apiKeyId } = query;

    const deviceValidation = await validateDevice(c, deviceId, apiKeyId);
    if (!deviceValidation.success) {
      return deviceValidation.response;
    }

    const paginationValidation = validatePagination(
      c,
      query.page,
      query.pageSize
    );
    if (!paginationValidation.success) {
      return paginationValidation.response;
    }

    const { page, pageSize, offset } = paginationValidation.data;

    const dateRangeValidation = validateDateRange(
      c,
      query.startDate,
      query.endDate
    );
    if (!dateRangeValidation.success) {
      return dateRangeValidation.response;
    }

    const filters: SQL[] = [eq(sessions.deviceId, deviceId)];

    const whereClause = buildFilters({
      filters,
      startDateColumn: sessions.startedAt,
      startDateValue: query.startDate,
      endDateColumn: sessions.startedAt,
      endDateValue: query.endDate,
    });

    const [sessionsList, [{ count: totalCount }]] = await Promise.all([
      db
        .select()
        .from(sessions)
        .where(whereClause)
        .orderBy(desc(sessions.startedAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: count() }).from(sessions).where(whereClause),
    ]);

    const formattedSessions = sessionsList.map((session) => ({
      sessionId: session.sessionId,
      deviceId: session.deviceId,
      startedAt: session.startedAt.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString(),
    }));

    return c.json(
      {
        sessions: formattedSessions,
        pagination: formatPaginationResponse(totalCount, page, pageSize),
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[Session.List] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to fetch sessions',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

export { sessionSdkRouter, sessionWebRouter };
