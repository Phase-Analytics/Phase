import {
  DeviceActivityTimeseriesResponseSchema,
  DeviceDetailSchema,
  DeviceLiveResponseSchema,
  DeviceOverviewResponseSchema,
  DevicesListResponseSchema,
  DeviceTimeseriesResponseSchema,
  ErrorCode,
  ErrorResponseSchema,
  HttpStatus,
  type Platform,
} from '@phase/shared';
import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  lt,
  lte,
  type SQL,
  sql,
} from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { apps, db, devices, sessions } from '@/db';
import { auth } from '@/lib/auth';
import {
  authPlugin,
  type BetterAuthSession,
  type BetterAuthUser,
} from '@/lib/middleware';
import { buildPropertySearchFilters } from '@/lib/property-search';
import {
  buildFilters,
  formatPaginationResponse,
  validateDateRange,
  validatePagination,
  validatePropertySearchFilter,
} from '@/lib/validators';

type AuthContext = { user: BetterAuthUser; session: BetterAuthSession };

function normalizePlatform(
  platform: string | null | undefined
): Platform | null {
  if (!platform) {
    return null;
  }
  const lower = platform.toLowerCase();
  if (lower === 'ios' || lower === 'android') {
    return lower as Platform;
  }
  return 'unknown';
}

export const deviceWebRouter = new Elysia({ prefix: '/devices' })
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
    '/overview',
    async (ctx) => {
      const { query, set } = ctx as typeof ctx & AuthContext;
      try {
        const appId = query.appId as string;

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
          [{ count: totalDevices }],
          [{ count: totalDevicesYesterday }],
          [{ count: activeDevices24h }],
          [{ count: activeDevicesYesterday }],
          platformStatsResult,
          countryStatsResult,
          cityStatsResult,
        ] = await Promise.all([
          db
            .select({ count: count() })
            .from(devices)
            .where(eq(devices.appId, appId)),

          db
            .select({ count: count() })
            .from(devices)
            .where(
              and(
                eq(devices.appId, appId),
                lt(devices.firstSeen, twentyFourHoursAgo)
              )
            ),

          db
            .select({ count: countDistinct(sessions.deviceId) })
            .from(sessions)
            .where(
              and(
                sql`${sessions.deviceId} IN (SELECT device_id FROM (${deviceIdsSubquery}) AS app_devices)`,
                gte(sessions.lastActivityAt, twentyFourHoursAgo),
                lte(sessions.lastActivityAt, now)
              )
            ),

          db
            .select({ count: countDistinct(sessions.deviceId) })
            .from(sessions)
            .where(
              and(
                sql`${sessions.deviceId} IN (SELECT device_id FROM (${deviceIdsSubquery}) AS app_devices)`,
                gte(sessions.lastActivityAt, fortyEightHoursAgo),
                lt(sessions.lastActivityAt, twentyFourHoursAgo)
              )
            ),

          db
            .select({
              platform: sql<string>`COALESCE(${devices.platform}, 'unknown')`,
              count: count(),
            })
            .from(devices)
            .where(eq(devices.appId, appId))
            .groupBy(devices.platform),

          db
            .select({
              country: devices.country,
              count: count(),
            })
            .from(devices)
            .where(eq(devices.appId, appId))
            .groupBy(devices.country),

          db
            .select({
              city: devices.city,
              country: devices.country,
              count: count(),
            })
            .from(devices)
            .where(eq(devices.appId, appId))
            .groupBy(devices.city, devices.country),
        ]);

        const totalDevicesNum = Number(totalDevices);
        const totalDevicesYesterdayNum = Number(totalDevicesYesterday);
        const activeDevices24hNum = Number(activeDevices24h);
        const activeDevicesYesterdayNum = Number(activeDevicesYesterday);

        const totalDevicesYesterdayForCalc = Math.max(
          totalDevicesYesterdayNum,
          1
        );
        const totalDevicesChange24h =
          ((totalDevicesNum - totalDevicesYesterdayNum) /
            totalDevicesYesterdayForCalc) *
          100;

        const activeDevicesYesterdayForCalc = Math.max(
          activeDevicesYesterdayNum,
          1
        );
        const activeDevicesChange24h =
          ((activeDevices24hNum - activeDevicesYesterdayNum) /
            activeDevicesYesterdayForCalc) *
          100;

        const platformStats: Record<string, number> = {
          ios: 0,
          android: 0,
          unknown: 0,
        };
        for (const row of platformStatsResult) {
          const normalizedPlatform = normalizePlatform(row.platform);
          if (normalizedPlatform) {
            platformStats[normalizedPlatform] = Number(row.count);
          }
        }

        const countryStats: Record<string, number> = {};
        for (const row of countryStatsResult) {
          if (row.country !== null) {
            countryStats[row.country] = Number(row.count);
          }
        }

        const cityStats: Record<string, { count: number; country: string }> =
          {};
        for (const row of cityStatsResult) {
          if (row.city !== null) {
            cityStats[row.city] = {
              count: Number(row.count),
              country: row.country || '',
            };
          }
        }

        set.status = HttpStatus.OK;
        return {
          totalDevices: totalDevicesNum,
          activeDevices24h: activeDevices24hNum,
          platformStats,
          countryStats,
          cityStats,
          totalDevicesChange24h: Number(totalDevicesChange24h.toFixed(2)),
          activeDevicesChange24h: Number(activeDevicesChange24h.toFixed(2)),
        };
      } catch (error) {
        console.error('[Device.Overview] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch device overview',
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
        200: DeviceOverviewResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/live',
    async (ctx) => {
      const { query, set } = ctx as typeof ctx & AuthContext;
      try {
        const appId = query.appId as string;

        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

        const deviceIdsSubquery = db
          .select({ deviceId: devices.deviceId })
          .from(devices)
          .where(eq(devices.appId, appId));

        const [{ count: activeNow }] = await db
          .select({ count: countDistinct(sessions.deviceId) })
          .from(sessions)
          .where(
            and(
              sql`${sessions.deviceId} IN (SELECT device_id FROM (${deviceIdsSubquery}) AS app_devices)`,
              gte(sessions.lastActivityAt, oneMinuteAgo),
              lte(sessions.lastActivityAt, now)
            )
          );

        set.status = HttpStatus.OK;
        return {
          activeNow: Number(activeNow),
        };
      } catch (error) {
        console.error('[Device.Live] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch live devices',
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
        200: DeviceLiveResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/',
    async (ctx) => {
      const { query, set } = ctx as typeof ctx & AuthContext;
      try {
        const appId = query.appId as string;
        const page = query.page ? Number.parseInt(query.page as string, 10) : 1;
        const pageSize = query.pageSize
          ? Number.parseInt(query.pageSize as string, 10)
          : 10;

        const paginationValidation = validatePagination(
          page.toString(),
          pageSize.toString()
        );
        if (!paginationValidation.success) {
          set.status = paginationValidation.error.status;
          return {
            code: paginationValidation.error.code,
            detail: paginationValidation.error.detail,
          };
        }

        const { offset } = paginationValidation.data;

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

        const filters: SQL[] = [eq(devices.appId, appId)];

        if (query.platform) {
          filters.push(eq(devices.platform, query.platform as Platform));
        }

        if (query.properties) {
          const propertyFilterValidation = validatePropertySearchFilter(
            query.properties as string
          );
          if (!propertyFilterValidation.success) {
            set.status = propertyFilterValidation.error.status;
            return {
              code: propertyFilterValidation.error.code,
              detail: propertyFilterValidation.error.detail,
            };
          }

          if (propertyFilterValidation.data) {
            const propertyFilters = buildPropertySearchFilters(
              devices.properties,
              propertyFilterValidation.data
            );
            filters.push(...propertyFilters);
          }
        }

        const whereClause = buildFilters({
          filters,
          startDateColumn: devices.firstSeen,
          startDateValue: query.startDate as string | undefined,
          endDateColumn: devices.firstSeen,
          endDateValue: query.endDate as string | undefined,
        });

        const [devicesList, [{ count: totalCount }]] = await Promise.all([
          db
            .select({
              deviceId: devices.deviceId,
              platform: devices.platform,
              country: devices.country,
              city: devices.city,
              firstSeen: devices.firstSeen,
            })
            .from(devices)
            .where(whereClause)
            .orderBy(desc(devices.firstSeen))
            .limit(pageSize)
            .offset(offset),
          db.select({ count: count() }).from(devices).where(whereClause),
        ]);

        set.status = HttpStatus.OK;
        return {
          devices: devicesList.map((device) => ({
            ...device,
            platform: normalizePlatform(device.platform),
            firstSeen: device.firstSeen.toISOString(),
          })),
          pagination: formatPaginationResponse(
            Number(totalCount),
            page,
            pageSize
          ),
        };
      } catch (error) {
        console.error('[Device.List] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch devices',
        };
      }
    },
    {
      requireAuth: true,
      verifyAppAccess: true,
      query: t.Object({
        appId: t.String(),
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        platform: t.Optional(
          t.Union([
            t.Literal('ios'),
            t.Literal('android'),
            t.Literal('unknown'),
          ])
        ),
        properties: t.Optional(t.String()),
      }),
      response: {
        200: DevicesListResponseSchema,
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
      const { query, set } = ctx as typeof ctx & AuthContext;
      try {
        const appId = query.appId as string;
        const startDate = query.startDate as string | undefined;
        const endDate = query.endDate as string | undefined;
        const metric = (query.metric as 'dau' | 'total' | undefined) ?? 'dau';

        const dateRangeValidation = validateDateRange(startDate, endDate);
        if (!dateRangeValidation.success) {
          set.status = dateRangeValidation.error.status;
          return {
            code: dateRangeValidation.error.code,
            detail: dateRangeValidation.error.detail,
          };
        }

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const start = startDate ? new Date(startDate) : sevenDaysAgo;
        const end = endDate ? new Date(endDate) : now;

        if (metric === 'dau') {
          const result = await db.execute<{
            date: string;
            activeUsers: number;
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
              COALESCE(COUNT(DISTINCT s.device_id), 0)::int as "activeUsers"
            FROM date_series ds
            LEFT JOIN (
              SELECT s.device_id, s.last_activity_at
              FROM sessions_analytics s
              INNER JOIN devices d ON s.device_id = d.device_id
              WHERE d.app_id = ${appId}
            ) s ON DATE(s.last_activity_at) = ds.date
            WHERE ds.date <= CURRENT_DATE
            GROUP BY ds.date
            ORDER BY ds.date
          `);

          const data = result.rows.map((row) => ({
            date: row.date,
            activeUsers: Number(row.activeUsers),
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
          totalUsers: number;
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
              (SELECT COUNT(DISTINCT d.device_id)::int
               FROM devices d
               WHERE d.app_id = ${appId}
                 AND DATE(d.first_seen) <= ds.date),
              0
            ) as "totalUsers"
          FROM date_series ds
          WHERE ds.date <= CURRENT_DATE
          ORDER BY ds.date
        `);

        const data = result.rows.map((row) => ({
          date: row.date,
          totalUsers: Number(row.totalUsers),
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
        console.error('[Device.Timeseries] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch device timeseries',
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
        metric: t.Optional(t.Union([t.Literal('dau'), t.Literal('total')])),
      }),
      response: {
        200: DeviceTimeseriesResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )

  .get(
    '/:deviceId',
    async (ctx) => {
      const { params, query, set } = ctx as typeof ctx & AuthContext;
      try {
        const { deviceId } = params;
        const appId = query.appId as string;

        const [device, sessionStats] = await Promise.all([
          db.query.devices.findFirst({
            where: (table, { eq: eqFn, and: andFn }) =>
              andFn(eqFn(table.deviceId, deviceId), eqFn(table.appId, appId)),
          }),
          db
            .select({
              lastActivityAt: sql<Date | null>`MAX(${sessions.lastActivityAt})::timestamp`,
            })
            .from(sessions)
            .where(eq(sessions.deviceId, deviceId)),
        ]);

        if (!device) {
          set.status = HttpStatus.NOT_FOUND;
          return {
            code: ErrorCode.NOT_FOUND,
            detail: 'Device not found',
          };
        }

        const [{ lastActivityAt }] = sessionStats;

        set.status = HttpStatus.OK;
        return {
          deviceId: device.deviceId,
          osVersion: device.osVersion,
          platform: normalizePlatform(device.platform),
          locale: device.locale,
          model: device.model,
          country: device.country,
          city: device.city,
          properties: device.properties,
          firstSeen: device.firstSeen.toISOString(),
          lastActivityAt: lastActivityAt
            ? (lastActivityAt instanceof Date
                ? lastActivityAt
                : new Date(lastActivityAt)
              ).toISOString()
            : null,
        };
      } catch (error) {
        console.error('[Device.Get] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch device',
        };
      }
    },
    {
      requireAuth: true,
      verifyAppAccess: true,
      params: t.Object({
        deviceId: t.String(),
      }),
      query: t.Object({
        appId: t.String(),
      }),
      response: {
        200: DeviceDetailSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )

  .get(
    '/:deviceId/activity',
    async (ctx) => {
      const { params, query, set } = ctx as typeof ctx & AuthContext;
      try {
        const { deviceId } = params;
        const appId = query.appId as string;
        const startDate = query.startDate as string | undefined;
        const endDate = query.endDate as string | undefined;

        const device = await db.query.devices.findFirst({
          where: (table, { eq: eqFn }) =>
            and(eqFn(table.deviceId, deviceId), eqFn(table.appId, appId)),
        });

        if (!device) {
          set.status = HttpStatus.NOT_FOUND;
          return {
            code: ErrorCode.NOT_FOUND,
            detail: 'Device not found',
          };
        }

        const now = new Date();
        const defaultStart = new Date(
          now.getTime() - 365 * 24 * 60 * 60 * 1000
        );
        const start = startDate ? new Date(startDate) : defaultStart;
        const end = endDate ? new Date(endDate) : now;

        const [result, sessionStats] = await Promise.all([
          db.execute<{
            date: string;
            sessionCount: number;
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
              COALESCE(COUNT(s.session_id), 0)::int as "sessionCount"
            FROM date_series ds
            LEFT JOIN sessions_analytics s ON DATE(s.started_at) = ds.date
              AND s.device_id = ${deviceId}
            WHERE ds.date <= CURRENT_DATE
            GROUP BY ds.date
            ORDER BY ds.date
          `),
          db
            .select({
              totalSessions: count(),
              avgDuration: sql<number | null>`
                AVG(EXTRACT(EPOCH FROM (${sessions.lastActivityAt} - ${sessions.startedAt})))
              `,
              lastActivityAt: sql<Date | null>`MAX(${sessions.lastActivityAt})::timestamp`,
            })
            .from(sessions)
            .where(eq(sessions.deviceId, deviceId)),
        ]);

        const data = result.rows.map((row) => ({
          date: row.date,
          sessionCount: Number(row.sessionCount),
        }));

        const [{ totalSessions, avgDuration, lastActivityAt }] = sessionStats;

        set.status = HttpStatus.OK;
        return {
          data,
          period: {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          },
          totalSessions: Number(totalSessions),
          avgSessionDuration: avgDuration ? Number(avgDuration) : null,
          firstSeen: device.firstSeen.toISOString(),
          lastActivityAt: lastActivityAt
            ? (lastActivityAt instanceof Date
                ? lastActivityAt
                : new Date(lastActivityAt)
              ).toISOString()
            : null,
        };
      } catch (error) {
        console.error('[Device.ActivityTimeseries] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch device activity timeseries',
        };
      }
    },
    {
      requireAuth: true,
      verifyAppAccess: true,
      params: t.Object({
        deviceId: t.String(),
      }),
      query: t.Object({
        appId: t.String(),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
      }),
      response: {
        200: DeviceActivityTimeseriesResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .delete(
    '/:deviceId',
    async (ctx) => {
      const { params, user, set, query } = ctx as typeof ctx & {
        user: BetterAuthUser;
        session: BetterAuthSession;
      };

      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'Authentication required',
          };
        }

        const { appId } = query;

        const device = await db.query.devices.findFirst({
          where: eq(devices.deviceId, params.deviceId),
        });

        if (!device) {
          set.status = HttpStatus.NOT_FOUND;
          return {
            code: ErrorCode.NOT_FOUND,
            detail: 'Device not found',
          };
        }

        const app = await db.query.apps.findFirst({
          where: and(eq(apps.id, appId), eq(apps.userId, user.id)),
        });

        if (!app) {
          set.status = HttpStatus.FORBIDDEN;
          return {
            code: ErrorCode.FORBIDDEN,
            detail: 'You must be the app owner to perform this action',
          };
        }

        if (device.appId !== appId) {
          set.status = HttpStatus.FORBIDDEN;
          return {
            code: ErrorCode.FORBIDDEN,
            detail: 'Device does not belong to this app',
          };
        }

        const deviceSessions = await db.query.sessions.findMany({
          where: eq(sessions.deviceId, params.deviceId),
          columns: { sessionId: true },
        });

        await Promise.all(
          deviceSessions.map((session) =>
            db.$cache?.invalidate({ tags: `session:${session.sessionId}` })
          )
        );

        await db.delete(devices).where(eq(devices.deviceId, params.deviceId));

        set.status = HttpStatus.NO_CONTENT;
      } catch (error) {
        console.error('[Device.Delete] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to delete device',
        };
      }
    },
    {
      requireAuth: true,
      params: t.Object({
        deviceId: t.String(),
      }),
      query: t.Object({
        appId: t.String(),
      }),
      response: {
        204: t.Void(),
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  );
