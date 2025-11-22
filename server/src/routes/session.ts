import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { and, count, desc, eq, gte, lt, lte, type SQL, sql } from 'drizzle-orm';
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
  sessionTimeseriesQuerySchema,
  sessionTimeseriesResponseSchema,
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

const getSessionTimeseriesRoute = createRoute({
  method: 'get',
  path: '/timeseries',
  tags: ['session'],
  description:
    'Get session timeseries data (daily session count or average session duration)',
  security: [{ CookieAuth: [] }],
  request: {
    query: sessionTimeseriesQuerySchema,
  },
  responses: {
    200: {
      description: 'Session timeseries data',
      content: {
        'application/json': {
          schema: sessionTimeseriesResponseSchema,
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
            lt(sessions.startedAt, twentyFourHoursAgo)
          )
        ),

      db
        .select({ count: count() })
        .from(sessions)
        .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
        .where(
          and(
            eq(devices.appId, appId),
            gte(sessions.startedAt, twentyFourHoursAgo),
            lte(sessions.startedAt, now)
          )
        ),

      db
        .select({ count: count() })
        .from(sessions)
        .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
        .where(
          and(
            eq(devices.appId, appId),
            gte(sessions.startedAt, fortyEightHoursAgo),
            lt(sessions.startedAt, twentyFourHoursAgo)
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

    if (deviceId) {
      const deviceValidation = await validateDevice(c, deviceId, appId);
      if (!deviceValidation.success) {
        return deviceValidation.response;
      }
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

    const filters: SQL[] = [];

    if (deviceId) {
      filters.push(eq(sessions.deviceId, deviceId));
    } else {
      filters.push(eq(devices.appId, appId));
    }

    const whereClause = buildFilters({
      filters,
      startDateColumn: sessions.startedAt,
      startDateValue: query.startDate,
      endDateColumn: sessions.startedAt,
      endDateValue: query.endDate,
    });

    const baseQuery = db
      .select({
        sessionId: sessions.sessionId,
        deviceId: sessions.deviceId,
        startedAt: sessions.startedAt,
        lastActivityAt: sessions.lastActivityAt,
      })
      .from(sessions);

    const countQuery = db.select({ count: count() }).from(sessions);

    if (!deviceId) {
      baseQuery.innerJoin(devices, eq(sessions.deviceId, devices.deviceId));
      countQuery.innerJoin(devices, eq(sessions.deviceId, devices.deviceId));
    }

    const [sessionsList, [{ count: totalCount }]] = await Promise.all([
      baseQuery
        .where(whereClause)
        .orderBy(desc(sessions.startedAt))
        .limit(pageSize)
        .offset(offset),
      countQuery.where(whereClause),
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

// biome-ignore lint/suspicious/noExplicitAny: OpenAPI handler type inference issue with union response types
sessionWebRouter.openapi(getSessionTimeseriesRoute, async (c: any) => {
  try {
    const query = c.req.valid('query');
    const { appId, startDate, endDate, metric = 'daily_sessions' } = query;

    const now = new Date();
    const defaultStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const start = startDate ? new Date(startDate) : defaultStart;
    const end = endDate ? new Date(endDate) : now;

    if (metric === 'daily_sessions') {
      const result = await db.execute<{
        date: string;
        dailySessions: number;
      }>(sql`
        WITH date_series AS (
          SELECT DATE(generate_series(
            ${start}::timestamp,
            ${end}::timestamp,
            '1 day'::interval
          )) as date
        )
        SELECT
          ds.date::text,
          COALESCE(COUNT(s.session_id), 0)::int as "dailySessions"
        FROM date_series ds
        LEFT JOIN sessions_analytics s ON DATE(s.started_at) = ds.date
        LEFT JOIN devices d ON s.device_id = d.device_id AND d.app_id = ${appId}
        WHERE ds.date <= CURRENT_DATE
        GROUP BY ds.date
        ORDER BY ds.date
      `);

      const data = result.rows.map((row) => ({
        date: row.date,
        dailySessions: Number(row.dailySessions),
      }));

      return c.json(
        {
          data,
          period: {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          },
        },
        HttpStatus.OK
      );
    }

    const result = await db.execute<{
      date: string;
      avgDuration: number;
    }>(sql`
      WITH date_series AS (
        SELECT DATE(generate_series(
          ${start}::timestamp,
          ${end}::timestamp,
          '1 day'::interval
        )) as date
      )
      SELECT
        ds.date::text,
        COALESCE(
          AVG(EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at))),
          0
        )::float as "avgDuration"
      FROM date_series ds
      LEFT JOIN sessions_analytics s ON DATE(s.started_at) = ds.date
      LEFT JOIN devices d ON s.device_id = d.device_id AND d.app_id = ${appId}
      WHERE ds.date <= CURRENT_DATE
      GROUP BY ds.date
      ORDER BY ds.date
    `);

    const data = result.rows.map((row) => ({
      date: row.date,
      avgDuration: Number(row.avgDuration),
    }));

    return c.json(
      {
        data,
        period: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[Session.Timeseries] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to fetch session timeseries',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

export { sessionSdkRouter, sessionWebRouter };
