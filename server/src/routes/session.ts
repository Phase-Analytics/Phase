import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { and, count, desc, eq, type SQL, sql } from 'drizzle-orm';
import { db, devices, sessions } from '@/db';
import type { App, Session, User } from '@/db/schema';
import { requireAppKey, requireAuth, verifyAppAccess } from '@/lib/middleware';
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
  sessionOverviewQuerySchema,
  sessionOverviewResponseSchema,
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

const getSessionOverviewRoute = createRoute({
  method: 'get',
  path: '/overview',
  tags: ['session'],
  description:
    'Get session overview metrics (total sessions, average duration, 24h active sessions)',
  security: [{ CookieAuth: [] }],
  request: {
    query: sessionOverviewQuerySchema,
  },
  responses: {
    200: {
      description: 'Session overview metrics',
      content: {
        'application/json': {
          schema: sessionOverviewResponseSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const sessionSdkRouter = new OpenAPIHono<{
  Variables: {
    app: App;
    userId: string;
  };
}>();

sessionSdkRouter.use('*', requireAppKey);

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
    app: App;
  };
}>();

sessionWebRouter.use('*', requireAuth, verifyAppAccess);

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
    const app = c.get('app');

    const deviceValidation = await validateDevice(c, body.deviceId, app.id);
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

// biome-ignore lint/suspicious/noExplicitAny: OpenAPI handler type inference issue with union response types
sessionWebRouter.openapi(getSessionOverviewRoute, async (c: any) => {
  try {
    const query = c.req.valid('query');
    const { appId } = query;

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const [
      [{ count: totalSessions }],
      [{ count: totalSessionsYesterday }],
      activeSessions24hResult,
      activeSessionsYesterdayResult,
      avgDurationResult,
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(sessions)
        .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
        .where(eq(devices.appId, appId)),

      db
        .select({ count: count() })
        .from(sessions)
        .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
        .where(
          and(
            eq(devices.appId, appId),
            sql`${sessions.startedAt} < ${twentyFourHoursAgo}`
          )
        ),

      db
        .select({ count: count() })
        .from(sessions)
        .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
        .where(
          and(
            eq(devices.appId, appId),
            sql`${sessions.startedAt} >= ${twentyFourHoursAgo}`
          )
        ),

      db
        .select({ count: count() })
        .from(sessions)
        .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
        .where(
          and(
            eq(devices.appId, appId),
            sql`${sessions.startedAt} >= ${fortyEightHoursAgo}`,
            sql`${sessions.startedAt} < ${twentyFourHoursAgo}`
          )
        ),

      db
        .select({
          avg: sql<number | null>`AVG(
            EXTRACT(EPOCH FROM (${sessions.lastActivityAt} - ${sessions.startedAt}))
          )`,
        })
        .from(sessions)
        .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
        .where(eq(devices.appId, appId)),
    ]);

    const totalSessionsNum = Number(totalSessions);
    const totalSessionsYesterdayNum = Number(totalSessionsYesterday);
    const activeSessions24h = Number(activeSessions24hResult[0]?.count ?? 0);
    const activeSessionsYesterday = Number(
      activeSessionsYesterdayResult[0]?.count ?? 0
    );

    const averageSessionDuration = avgDurationResult[0]?.avg
      ? Number(avgDurationResult[0].avg)
      : null;

    const totalSessionsYesterdayForCalc = Math.max(
      totalSessionsYesterdayNum,
      1
    );
    const totalSessionsChange24h =
      ((totalSessionsNum - totalSessionsYesterdayNum) /
        totalSessionsYesterdayForCalc) *
      100;

    const activeSessionsYesterdayForCalc = Math.max(activeSessionsYesterday, 1);
    const activeSessions24hChange =
      ((activeSessions24h - activeSessionsYesterday) /
        activeSessionsYesterdayForCalc) *
      100;

    return c.json(
      {
        totalSessions: totalSessionsNum,
        averageSessionDuration,
        activeSessions24h,
        totalSessionsChange24h: Number(totalSessionsChange24h.toFixed(2)),
        activeSessions24hChange: Number(activeSessions24hChange.toFixed(2)),
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[Session.Overview] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to fetch session overview',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

sessionWebRouter.openapi(getSessionsRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const { deviceId, appId } = query;

    const deviceValidation = await validateDevice(c, deviceId, appId);
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
