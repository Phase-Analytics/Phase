import { and, count, desc, eq, gte, lt, lte, type SQL, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { db, devices, sessions } from '@/db';
import { auth } from '@/lib/auth';
import {
  type App,
  authPlugin,
  type BetterAuthSession,
  type BetterAuthUser,
} from '@/lib/middleware';
import {
  buildFilters,
  formatPaginationResponse,
  validateDateRange,
  validateDevice,
  validatePagination,
} from '@/lib/validators';
import {
  ErrorCode,
  ErrorResponseSchema,
  HttpStatus,
  SessionOverviewResponseSchema,
  SessionsListResponseSchema,
  SessionTimeseriesResponseSchema,
} from '@/schemas';

type AuthContext = {
  user: BetterAuthUser;
  session: BetterAuthSession;
  store: { app: App };
};

export const sessionWebRouter = new Elysia({ prefix: '/sessions' })
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    return {
      user: session?.user as BetterAuthUser,
      session: session?.session as BetterAuthSession,
    };
  })
  .use(authPlugin)
  .get(
    '/',
    async (ctx) => {
      const { query, user, set } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'User authentication required',
          };
        }

        const appId = query.appId as string;
        const deviceId = query.deviceId as string | undefined;

        if (!appId) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'appId is required',
          };
        }

        if (deviceId) {
          const deviceValidation = await validateDevice(deviceId, appId);
          if (!deviceValidation.success) {
            set.status = deviceValidation.error.status;
            return {
              code: deviceValidation.error.code,
              detail: deviceValidation.error.detail,
            };
          }
        }

        const paginationValidation = validatePagination(
          (query.page as string) ?? '1',
          (query.pageSize as string) ?? '10'
        );
        if (!paginationValidation.success) {
          set.status = paginationValidation.error.status;
          return {
            code: paginationValidation.error.code,
            detail: paginationValidation.error.detail,
          };
        }

        const { page, pageSize, offset } = paginationValidation.data;

        const dateRangeValidation = validateDateRange(
          query.startDate as string | undefined,
          query.endDate as string | undefined
        );
        if (!dateRangeValidation.success) {
          set.status = dateRangeValidation.error.status;
          return {
            code: dateRangeValidation.error.code,
            detail: dateRangeValidation.error.detail,
          };
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
          startDateValue: query.startDate as string | undefined,
          endDateColumn: sessions.startedAt,
          endDateValue: query.endDate as string | undefined,
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
          countQuery.innerJoin(
            devices,
            eq(sessions.deviceId, devices.deviceId)
          );
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

        set.status = HttpStatus.OK;
        return {
          sessions: formattedSessions,
          pagination: formatPaginationResponse(totalCount, page, pageSize),
        };
      } catch (error) {
        console.error('[Session.List] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch sessions',
        };
      }
    },
    {
      requireAuth: true,
      verifyAppAccess: true,
      query: t.Object({
        appId: t.String(),
        deviceId: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
      }),
      response: {
        200: SessionsListResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/overview',
    async (ctx) => {
      const { query, user, set } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'User authentication required',
          };
        }

        const appId = query.appId as string;

        if (!appId) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'appId is required',
          };
        }

        const now = new Date();
        const twentyFourHoursAgo = new Date(
          now.getTime() - 24 * 60 * 60 * 1000
        );
        const fortyEightHoursAgo = new Date(
          now.getTime() - 48 * 60 * 60 * 1000
        );

        const deviceIdsSubquery = db
          .select({ deviceId: devices.deviceId })
          .from(devices)
          .where(eq(devices.appId, appId));

        const [
          [{ count: totalSessions }],
          [{ count: totalSessionsYesterday }],
          activeSessions24hResult,
          activeSessionsYesterdayResult,
          avgDurationResult,
          bouncedSessionsResult,
          bouncedSessions24hResult,
          totalSessions24hResult,
          bouncedSessionsYesterdayResult,
          totalSessionsYesterdayForBounceResult,
        ] = await Promise.all([
          db
            .select({ count: count() })
            .from(sessions)
            .where(
              sql`${sessions.deviceId} IN (SELECT device_id FROM (${deviceIdsSubquery}) AS app_devices)`
            ),

          db
            .select({ count: count() })
            .from(sessions)
            .where(
              and(
                sql`${sessions.deviceId} IN (SELECT device_id FROM (${deviceIdsSubquery}) AS app_devices)`,
                lt(sessions.startedAt, twentyFourHoursAgo)
              )
            ),

          db
            .select({ count: count() })
            .from(sessions)
            .where(
              and(
                sql`${sessions.deviceId} IN (SELECT device_id FROM (${deviceIdsSubquery}) AS app_devices)`,
                gte(sessions.startedAt, twentyFourHoursAgo),
                lte(sessions.startedAt, now)
              )
            ),

          db
            .select({ count: count() })
            .from(sessions)
            .where(
              and(
                sql`${sessions.deviceId} IN (SELECT device_id FROM (${deviceIdsSubquery}) AS app_devices)`,
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
            .where(
              sql`${sessions.deviceId} IN (SELECT device_id FROM (${deviceIdsSubquery}) AS app_devices)`
            ),

          db
            .select({ count: count() })
            .from(sessions)
            .where(
              and(
                sql`${sessions.deviceId} IN (SELECT device_id FROM (${deviceIdsSubquery}) AS app_devices)`,
                sql`EXTRACT(EPOCH FROM (${sessions.lastActivityAt} - ${sessions.startedAt})) < 10`
              )
            ),

          db
            .select({ count: count() })
            .from(sessions)
            .where(
              and(
                sql`${sessions.deviceId} IN (SELECT device_id FROM (${deviceIdsSubquery}) AS app_devices)`,
                gte(sessions.startedAt, twentyFourHoursAgo),
                lte(sessions.startedAt, now),
                sql`EXTRACT(EPOCH FROM (${sessions.lastActivityAt} - ${sessions.startedAt})) < 10`
              )
            ),

          db
            .select({ count: count() })
            .from(sessions)
            .where(
              and(
                sql`${sessions.deviceId} IN (SELECT device_id FROM (${deviceIdsSubquery}) AS app_devices)`,
                gte(sessions.startedAt, twentyFourHoursAgo),
                lte(sessions.startedAt, now)
              )
            ),

          db
            .select({ count: count() })
            .from(sessions)
            .where(
              and(
                sql`${sessions.deviceId} IN (SELECT device_id FROM (${deviceIdsSubquery}) AS app_devices)`,
                gte(sessions.startedAt, fortyEightHoursAgo),
                lt(sessions.startedAt, twentyFourHoursAgo),
                sql`EXTRACT(EPOCH FROM (${sessions.lastActivityAt} - ${sessions.startedAt})) < 10`
              )
            ),

          db
            .select({ count: count() })
            .from(sessions)
            .where(
              and(
                sql`${sessions.deviceId} IN (SELECT device_id FROM (${deviceIdsSubquery}) AS app_devices)`,
                gte(sessions.startedAt, fortyEightHoursAgo),
                lt(sessions.startedAt, twentyFourHoursAgo)
              )
            ),
        ]);

        const totalSessionsNum = Number(totalSessions);
        const totalSessionsYesterdayNum = Number(totalSessionsYesterday);
        const activeSessions24h = Number(
          activeSessions24hResult[0]?.count ?? 0
        );
        const activeSessionsYesterday = Number(
          activeSessionsYesterdayResult[0]?.count ?? 0
        );
        const bouncedSessions = Number(bouncedSessionsResult[0]?.count ?? 0);
        const bouncedSessions24h = Number(
          bouncedSessions24hResult[0]?.count ?? 0
        );
        const totalSessions24h = Number(totalSessions24hResult[0]?.count ?? 0);
        const bouncedSessionsYesterday = Number(
          bouncedSessionsYesterdayResult[0]?.count ?? 0
        );
        const totalSessionsYesterdayForBounce = Number(
          totalSessionsYesterdayForBounceResult[0]?.count ?? 0
        );

        const averageSessionDuration = avgDurationResult[0]?.avg
          ? Number(avgDurationResult[0].avg)
          : null;

        const bounceRate =
          totalSessionsNum > 0
            ? Number(((bouncedSessions / totalSessionsNum) * 100).toFixed(2))
            : 0;

        const bounceRate24h =
          totalSessions24h > 0
            ? (bouncedSessions24h / totalSessions24h) * 100
            : 0;

        const bounceRateYesterday =
          totalSessionsYesterdayForBounce > 0
            ? (bouncedSessionsYesterday / totalSessionsYesterdayForBounce) * 100
            : 0;

        const bounceRateYesterdayForCalc = Math.max(bounceRateYesterday, 0.01);
        const bounceRateChange24h =
          ((bounceRate24h - bounceRateYesterday) / bounceRateYesterdayForCalc) *
          100;

        const totalSessionsYesterdayForCalc = Math.max(
          totalSessionsYesterdayNum,
          1
        );
        const totalSessionsChange24h =
          ((totalSessionsNum - totalSessionsYesterdayNum) /
            totalSessionsYesterdayForCalc) *
          100;

        const activeSessionsYesterdayForCalc = Math.max(
          activeSessionsYesterday,
          1
        );
        const activeSessions24hChange =
          ((activeSessions24h - activeSessionsYesterday) /
            activeSessionsYesterdayForCalc) *
          100;

        set.status = HttpStatus.OK;
        return {
          totalSessions: totalSessionsNum,
          averageSessionDuration,
          activeSessions24h,
          totalSessionsChange24h: Number(totalSessionsChange24h.toFixed(2)),
          activeSessions24hChange: Number(activeSessions24hChange.toFixed(2)),
          bounceRate,
          bounceRateChange24h: Number(bounceRateChange24h.toFixed(2)),
        };
      } catch (error) {
        console.error('[Session.Overview] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch session overview',
        };
      }
    },
    {
      requireAuth: true,
      verifyAppAccess: true,
      query: t.Object({
        appId: t.String(),
      }),
      response: {
        200: SessionOverviewResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/timeseries',
    async (ctx) => {
      const { query, user, set } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'User authentication required',
          };
        }

        const appId = query.appId as string;
        const startDate = query.startDate as string | undefined;
        const endDate = query.endDate as string | undefined;
        const metric = (query.metric as string) ?? 'daily_sessions';

        if (!appId) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'appId is required',
          };
        }

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
        LEFT JOIN (
          SELECT s.session_id, s.started_at
          FROM sessions_analytics s
          INNER JOIN devices d ON s.device_id = d.device_id
          WHERE d.app_id = ${appId}
        ) s ON DATE(s.started_at) = ds.date
        WHERE ds.date <= CURRENT_DATE
        GROUP BY ds.date
        ORDER BY ds.date
      `);

          const data = result.rows.map((row) => ({
            date: row.date,
            dailySessions: Number(row.dailySessions),
          }));

          set.status = HttpStatus.OK;
          return {
            data,
            period: {
              startDate: start.toISOString(),
              endDate: end.toISOString(),
            },
          };
        }

        if (metric === 'bounce_rate') {
          const result = await db.execute<{
            date: string;
            bounceRate: number;
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
            (SUM(CASE WHEN EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at)) < 10 THEN 1 ELSE 0 END)::float
            / NULLIF(COUNT(s.session_id), 0)) * 100,
            0
          )::float as "bounceRate"
        FROM date_series ds
        LEFT JOIN (
          SELECT s.session_id, s.started_at, s.last_activity_at
          FROM sessions_analytics s
          INNER JOIN devices d ON s.device_id = d.device_id
          WHERE d.app_id = ${appId}
        ) s ON DATE(s.started_at) = ds.date
        WHERE ds.date <= CURRENT_DATE
        GROUP BY ds.date
        ORDER BY ds.date
      `);

          const data = result.rows.map((row) => ({
            date: row.date,
            bounceRate: Number(row.bounceRate.toFixed(2)),
          }));

          set.status = HttpStatus.OK;
          return {
            data,
            period: {
              startDate: start.toISOString(),
              endDate: end.toISOString(),
            },
          };
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
      LEFT JOIN (
        SELECT s.started_at, s.last_activity_at
        FROM sessions_analytics s
        INNER JOIN devices d ON s.device_id = d.device_id
        WHERE d.app_id = ${appId}
      ) s ON DATE(s.started_at) = ds.date
      WHERE ds.date <= CURRENT_DATE
      GROUP BY ds.date
      ORDER BY ds.date
    `);

        const data = result.rows.map((row) => ({
          date: row.date,
          avgDuration: Number(row.avgDuration),
        }));

        set.status = HttpStatus.OK;
        return {
          data,
          period: {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          },
        };
      } catch (error) {
        console.error('[Session.Timeseries] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch session timeseries',
        };
      }
    },
    {
      requireAuth: true,
      verifyAppAccess: true,
      query: t.Object({
        appId: t.String(),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        metric: t.Optional(t.String()),
      }),
      response: {
        200: SessionTimeseriesResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  );
