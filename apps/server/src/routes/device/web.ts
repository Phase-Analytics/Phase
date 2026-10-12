import {
  DeviceActivityTimeseriesResponseSchema,
  DeviceDetailSchema,
  DeviceLiveResponseSchema,
  DeviceOverviewResponseSchema,
  DeviceRetentionResponseSchema,
  DevicesListResponseSchema,
  DeviceTimeseriesResponseSchema,
  ErrorCode,
  ErrorResponseSchema,
  HttpStatus,
  type Platform,
  resolveDeviceModel,
} from '@phase/shared';
import {
  and,
  count,
  countDistinct,
  eq,
  gte,
  lte,
  max,
  type SQL,
  sql,
} from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { apps, db, devices, sessions } from '@/db';
import { auth } from '@/lib/auth';
import { invalidateIngestDevice } from '@/lib/ingest-cache';
import {
  authPlugin,
  type BetterAuthSession,
  type BetterAuthUser,
} from '@/lib/middleware';
import { buildPropertySearchFilters } from '@/lib/property-search';
import { parseTimeZone, resolveDayRange } from '@/lib/reports/day-range';
import { getDevicePage } from '@/lib/reports/device-list';
import {
  getCumulativeDevices,
  getDailyActiveDevices,
  getDeviceBreakdowns,
  getDeviceCounts,
  getDeviceDailySessions,
  normalizePlatform,
} from '@/lib/reports/devices';
import { getDeviceRetention } from '@/lib/reports/retention';
import {
  buildFilters,
  formatPaginationResponse,
  SESSION_MIN_DURATION_SECONDS,
  validateDateRange,
  validatePagination,
  validatePropertySearchFilter,
} from '@/lib/validators';

type AuthContext = { user: BetterAuthUser; session: BetterAuthSession };

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

        const [counts, breakdowns] = await Promise.all([
          getDeviceCounts(appId),
          getDeviceBreakdowns(appId),
        ]);

        set.status = HttpStatus.OK;
        return {
          totalDevices: counts.total,
          activeDevices24h: counts.active24h,
          platformStats: breakdowns.platformStats,
          countryStats: breakdowns.countryStats,
          appVersionStats: breakdowns.appVersionStats,
          // total now minus total 24h ago
          totalDevicesChange24h: counts.firstSeenSince24h,
          activeDevicesChange24h: counts.active24h - counts.activeYesterday,
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

        const { rows: devicesList, total: totalCount } = await getDevicePage({
          where: whereClause,
          limit: pageSize,
          offset,
        });

        set.status = HttpStatus.OK;
        return {
          devices: devicesList.map((device) => ({
            deviceId: device.deviceId,
            platform: normalizePlatform(device.platform),
            country: device.country,
            firstSeen: device.firstSeen.toISOString(),
            lastSeen: device.lastSeen ? device.lastSeen.toISOString() : null,
          })),
          pagination: formatPaginationResponse(totalCount, page, pageSize),
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

        set.status = HttpStatus.OK;
        if (metric === 'dau') {
          const series = await getDailyActiveDevices(appId, range);
          return {
            data: series.map((point) => ({
              date: point.date,
              activeUsers: point.count,
            })),
            period: range.period,
          };
        }

        const series = await getCumulativeDevices(appId, range);
        return {
          data: series.map((point) => ({
            date: point.date,
            totalUsers: point.count,
          })),
          period: range.period,
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
        tz: t.Optional(t.String()),
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
    '/retention',
    async (ctx) => {
      const { query, set } = ctx as typeof ctx & AuthContext;
      try {
        const appId = query.appId as string;
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

        const timeZone = parseTimeZone(query.tz);
        if (!timeZone.success) {
          set.status = timeZone.error.status;
          return {
            code: timeZone.error.code,
            detail: timeZone.error.detail,
          };
        }

        const range = resolveDayRange({
          startDate: query.startDate as string | undefined,
          endDate: query.endDate as string | undefined,
          defaultDays: 60,
          timeZone: timeZone.data,
        });
        const data = await getDeviceRetention(appId, range);
        const rateByDay = new Map(
          data.map((point) => [point.day, point.retentionRate])
        );
        const summary = {
          d1: rateByDay.get(1) ?? 0,
          d3: rateByDay.get(3) ?? 0,
          d7: rateByDay.get(7) ?? 0,
          d14: rateByDay.get(14) ?? 0,
          d30: rateByDay.get(30) ?? 0,
        };

        set.status = HttpStatus.OK;
        return {
          summary,
          data,
          period: range.period,
        };
      } catch (error) {
        console.error('[Device.Retention] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch device retention',
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
        tz: t.Optional(t.String()),
      }),
      response: {
        200: DeviceRetentionResponseSchema,
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
            .select({ lastActivityAt: max(sessions.lastActivityAt) })
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
          model: resolveDeviceModel(device.model),
          country: device.country,
          properties: device.properties,
          firstSeen: device.firstSeen.toISOString(),
          lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null,
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
          defaultDays: 365,
          timeZone: timeZone.data,
        });

        // The ownership check gates the response; the session reads run
        // alongside it and are discarded when the device is not in this app.
        const [device, data, [sessionStats]] = await Promise.all([
          db.query.devices.findFirst({
            where: (table, { eq: eqFn }) =>
              and(eqFn(table.deviceId, deviceId), eqFn(table.appId, appId)),
          }),
          getDeviceDailySessions(deviceId, range),
          db
            .select({
              totalSessions: count(),
              avgDuration: sql<number | null>`
                AVG(EXTRACT(EPOCH FROM (${sessions.lastActivityAt} - ${sessions.startedAt})))
              `,
              lastActivityAt: max(sessions.lastActivityAt),
            })
            .from(sessions)
            .where(
              and(
                eq(sessions.deviceId, deviceId),
                sql`EXTRACT(EPOCH FROM (${sessions.lastActivityAt} - ${sessions.startedAt})) >= ${SESSION_MIN_DURATION_SECONDS}`
              )
            ),
        ]);

        if (!device) {
          set.status = HttpStatus.NOT_FOUND;
          return {
            code: ErrorCode.NOT_FOUND,
            detail: 'Device not found',
          };
        }

        const { totalSessions, avgDuration, lastActivityAt } = sessionStats;

        set.status = HttpStatus.OK;
        return {
          data: data.map((point) => ({
            date: point.date,
            sessionCount: point.count,
          })),
          period: range.period,
          totalSessions: Number(totalSessions),
          avgSessionDuration: avgDuration ? Number(avgDuration) : null,
          firstSeen: device.firstSeen.toISOString(),
          lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null,
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
        tz: t.Optional(t.String()),
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

        await db.delete(devices).where(eq(devices.deviceId, params.deviceId));
        invalidateIngestDevice(params.deviceId);

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
