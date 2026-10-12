import {
  ErrorCode,
  ErrorResponseSchema,
  HttpStatus,
  SessionOverviewResponseSchema,
  SessionsListResponseSchema,
  SessionTimeseriesResponseSchema,
} from '@phase/shared';
import { count, desc, eq, type SQL, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { db, devices, sessions } from '@/db';
import { auth } from '@/lib/auth';
import {
  type App,
  authPlugin,
  type BetterAuthSession,
  type BetterAuthUser,
} from '@/lib/middleware';
import { parseTimeZone, resolveDayRange } from '@/lib/reports/day-range';
import {
  getSessionDailySeries,
  getSessionOverview,
} from '@/lib/reports/sessions';
import {
  buildFilters,
  formatPaginationResponse,
  SESSION_MIN_DURATION_SECONDS,
  validateDateRange,
  validateDevice,
  validatePagination,
} from '@/lib/validators';

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
        filters.push(
          sql`EXTRACT(EPOCH FROM (${sessions.lastActivityAt} - ${sessions.startedAt})) >= ${SESSION_MIN_DURATION_SECONDS}`
        );

        if (deviceId) {
          filters.push(eq(sessions.deviceId, deviceId));
          filters.push(eq(devices.appId, appId));
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
            country: devices.country,
            platform: devices.platform,
          })
          .from(sessions)
          .innerJoin(devices, eq(sessions.deviceId, devices.deviceId));

        const countQuery = db
          .select({ count: count() })
          .from(sessions)
          .innerJoin(devices, eq(sessions.deviceId, devices.deviceId));

        const [sessionsList, [{ count: totalCount }]] = await Promise.all([
          baseQuery
            .where(whereClause)
            .orderBy(desc(sessions.startedAt))
            .limit(pageSize)
            .offset(offset),
          countQuery.where(whereClause),
        ]);

        const formattedSessions = sessionsList.map((session) => {
          let platform: 'ios' | 'android' | 'unknown' | null = null;
          if (session.platform === 'ios' || session.platform === 'android') {
            platform = session.platform;
          } else if (session.platform) {
            platform = 'unknown';
          }

          return {
            sessionId: session.sessionId,
            deviceId: session.deviceId,
            startedAt: session.startedAt.toISOString(),
            lastActivityAt: session.lastActivityAt.toISOString(),
            country: session.country,
            platform,
          };
        });

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

        set.status = HttpStatus.OK;
        return await getSessionOverview(appId);
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

        const dateRangeValidation = validateDateRange(startDate, endDate);
        if (!dateRangeValidation.success) {
          set.status = dateRangeValidation.error.status;
          return {
            code: dateRangeValidation.error.code,
            detail: dateRangeValidation.error.detail,
          };
        }

        const timeZone = parseTimeZone(query.tz);
        if (!timeZone.success) {
          set.status = timeZone.error.status;
          return {
            code: timeZone.error.code,
            detail: timeZone.error.detail,
          };
        }

        const range = resolveDayRange({
          startDate,
          endDate,
          defaultDays: 7,
          timeZone: timeZone.data,
        });
        const series = await getSessionDailySeries(appId, range);

        set.status = HttpStatus.OK;
        if (metric === 'daily_sessions') {
          return {
            data: series.map((point) => ({
              date: point.date,
              dailySessions: point.sessions,
            })),
            period: range.period,
          };
        }
        if (metric === 'bounce_rate') {
          return {
            data: series.map((point) => ({
              date: point.date,
              bounceRate: point.bounceRate,
            })),
            period: range.period,
          };
        }
        return {
          data: series.map((point) => ({
            date: point.date,
            avgDuration: point.avgDuration,
          })),
          period: range.period,
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
        tz: t.Optional(t.String()),
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
