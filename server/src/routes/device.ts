import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  lt,
  lte,
  or,
  type SQL,
  sql,
} from 'drizzle-orm';
import { db, devices, sessions } from '@/db';
import type { App, Session, User } from '@/db/schema';
import { getCountryFromIP } from '@/lib/geolocation';
import { requireAppKey, requireAuth, verifyAppAccess } from '@/lib/middleware';
import { methodNotAllowed } from '@/lib/response';
import {
  buildFilters,
  formatPaginationResponse,
  validateDateRange,
  validatePagination,
} from '@/lib/validators';
import {
  createDeviceRequestSchema,
  deviceDetailSchema,
  deviceLiveQuerySchema,
  deviceLiveResponseSchema,
  deviceOverviewQuerySchema,
  deviceOverviewResponseSchema,
  deviceSchema,
  devicesListResponseSchema,
  deviceTimeseriesQuerySchema,
  deviceTimeseriesResponseSchema,
  ErrorCode,
  errorResponses,
  getDeviceQuerySchema,
  HttpStatus,
  listDevicesQuerySchema,
} from '@/schemas';

const createDeviceRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['device'],
  description: 'Create or update a device',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createDeviceRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Device created or updated',
      content: {
        'application/json': {
          schema: deviceSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const getDevicesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['device'],
  description: 'List devices for a specific app',
  security: [{ CookieAuth: [] }],
  request: {
    query: listDevicesQuerySchema,
  },
  responses: {
    200: {
      description: 'Devices list',
      content: {
        'application/json': {
          schema: devicesListResponseSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const getDeviceRoute = createRoute({
  method: 'get',
  path: '/:deviceId',
  tags: ['device'],
  description: 'Get device details with last activity and total sessions',
  security: [{ CookieAuth: [] }],
  request: {
    query: getDeviceQuerySchema,
  },
  responses: {
    200: {
      description: 'Device details',
      content: {
        'application/json': {
          schema: deviceDetailSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const getDeviceOverviewRoute = createRoute({
  method: 'get',
  path: '/overview',
  tags: ['device'],
  description:
    'Get device overview metrics (platform stats, total devices, 24h active devices)',
  security: [{ CookieAuth: [] }],
  request: {
    query: deviceOverviewQuerySchema,
  },
  responses: {
    200: {
      description: 'Device overview metrics',
      content: {
        'application/json': {
          schema: deviceOverviewResponseSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const getDeviceTimeseriesRoute = createRoute({
  method: 'get',
  path: '/timeseries',
  tags: ['device'],
  description: 'Get daily active users time-series (default: last 7 days)',
  security: [{ CookieAuth: [] }],
  request: {
    query: deviceTimeseriesQuerySchema,
  },
  responses: {
    200: {
      description: 'Daily active users time-series data',
      content: {
        'application/json': {
          schema: deviceTimeseriesResponseSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const getDeviceLiveRoute = createRoute({
  method: 'get',
  path: '/live',
  tags: ['device'],
  description: 'Get currently active devices (last 1 minute)',
  security: [{ CookieAuth: [] }],
  request: {
    query: deviceLiveQuerySchema,
  },
  responses: {
    200: {
      description: 'Live active devices',
      content: {
        'application/json': {
          schema: deviceLiveResponseSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const deviceSdkRouter = new OpenAPIHono<{
  Variables: {
    app: App;
    userId: string;
  };
}>();

deviceSdkRouter.use('*', requireAppKey);

deviceSdkRouter.all('*', async (c, next) => {
  const method = c.req.method;
  const allowedMethods = ['POST'];

  if (!allowedMethods.includes(method)) {
    return methodNotAllowed(c, allowedMethods);
  }

  return await next();
});

const deviceWebRouter = new OpenAPIHono<{
  Variables: {
    user: User;
    session: Session;
    app: App;
  };
}>();

deviceWebRouter.use('*', requireAuth, verifyAppAccess);

deviceWebRouter.all('*', async (c, next) => {
  const method = c.req.method;
  const allowedMethods = ['GET'];

  if (!allowedMethods.includes(method)) {
    return methodNotAllowed(c, allowedMethods);
  }

  return await next();
});

// biome-ignore lint/suspicious/noExplicitAny: OpenAPI handler type inference issue with union response types
deviceSdkRouter.openapi(createDeviceRoute, async (c: any) => {
  try {
    const body = c.req.valid('json');
    const app = c.get('app');

    if (!app?.id) {
      return c.json(
        {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'App key is required',
        },
        HttpStatus.UNAUTHORIZED
      );
    }

    const ip =
      c.req.header('cf-connecting-ip') ??
      c.req.header('x-forwarded-for')?.split(',')[0].trim() ??
      c.req.header('x-real-ip') ??
      '';

    let country: string | null = null;

    const existingDevice = await db.query.devices.findFirst({
      where: (table, { eq: eqFn }) => eqFn(table.deviceId, body.deviceId),
    });

    let device: typeof devices.$inferSelect;

    if (existingDevice) {
      if (existingDevice.appId !== app.id) {
        return c.json(
          {
            code: ErrorCode.FORBIDDEN,
            detail: 'You do not have permission to update this device',
          },
          HttpStatus.FORBIDDEN
        );
      }

      [device] = await db
        .update(devices)
        .set({
          identifier: body.identifier ?? existingDevice.identifier,
          model: body.model ?? existingDevice.model,
          osVersion: body.osVersion ?? existingDevice.osVersion,
          platform: body.platform ?? existingDevice.platform,
          appVersion: body.appVersion ?? existingDevice.appVersion,
        })
        .where(eq(devices.deviceId, body.deviceId))
        .returning();
    } else {
      if (ip) {
        country = await getCountryFromIP(ip);
      }

      [device] = await db
        .insert(devices)
        .values({
          deviceId: body.deviceId,
          appId: app.id,
          identifier: body.identifier ?? null,
          model: body.model ?? null,
          osVersion: body.osVersion ?? null,
          platform: body.platform ?? null,
          appVersion: body.appVersion ?? null,
          country: country ?? null,
        })
        .returning();
    }

    return c.json(
      {
        deviceId: device.deviceId,
        identifier: device.identifier,
        model: device.model,
        osVersion: device.osVersion,
        platform: device.platform,
        appVersion: device.appVersion,
        country: device.country,
        firstSeen: device.firstSeen.toISOString(),
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[Device.Upsert] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to create or update device',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

// biome-ignore lint/suspicious/noExplicitAny: OpenAPI handler type inference issue with union response types
deviceWebRouter.openapi(getDeviceOverviewRoute, async (c: any) => {
  try {
    const query = c.req.valid('query');
    const { appId } = query;

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const [
      [{ count: totalDevices }],
      [{ count: totalDevicesYesterday }],
      [{ count: activeDevices24h }],
      [{ count: activeDevicesYesterday }],
      platformStatsResult,
      countryStatsResult,
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
        .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
        .where(
          and(
            eq(devices.appId, appId),
            gte(sessions.lastActivityAt, twentyFourHoursAgo),
            lte(sessions.lastActivityAt, now)
          )
        ),

      db
        .select({ count: countDistinct(sessions.deviceId) })
        .from(sessions)
        .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
        .where(
          and(
            eq(devices.appId, appId),
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
    ]);

    const totalDevicesNum = Number(totalDevices);
    const totalDevicesYesterdayNum = Number(totalDevicesYesterday);
    const activeDevices24hNum = Number(activeDevices24h);
    const activeDevicesYesterdayNum = Number(activeDevicesYesterday);

    const totalDevicesYesterdayForCalc = Math.max(totalDevicesYesterdayNum, 1);
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
      web: 0,
      unknown: 0,
    };

    for (const row of platformStatsResult) {
      const platform = row.platform.toLowerCase();
      if (platform === 'ios' || platform === 'android' || platform === 'web') {
        platformStats[platform] = Number(row.count);
      } else {
        platformStats.unknown += Number(row.count);
      }
    }

    const countryStats: Record<string, number> = {};

    for (const row of countryStatsResult) {
      if (row.country !== null) {
        countryStats[row.country] = Number(row.count);
      }
    }

    return c.json(
      {
        totalDevices: totalDevicesNum,
        activeDevices24h: activeDevices24hNum,
        platformStats,
        countryStats,
        totalDevicesChange24h: Number(totalDevicesChange24h.toFixed(2)),
        activeDevicesChange24h: Number(activeDevicesChange24h.toFixed(2)),
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[Device.Overview] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to fetch device overview',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

// biome-ignore lint/suspicious/noExplicitAny: OpenAPI handler type inference issue with union response types
deviceWebRouter.openapi(getDeviceLiveRoute, async (c: any) => {
  try {
    const query = c.req.valid('query');
    const { appId } = query;

    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    const [{ count: activeNow }] = await db
      .select({ count: countDistinct(sessions.deviceId) })
      .from(sessions)
      .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
      .where(
        and(
          eq(devices.appId, appId),
          gte(sessions.lastActivityAt, oneMinuteAgo),
          lte(sessions.lastActivityAt, now)
        )
      );

    return c.json(
      {
        activeNow: Number(activeNow),
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[Device.Live] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to fetch live devices',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

deviceWebRouter.openapi(getDevicesRoute, async (c) => {
  try {
    const query = c.req.valid('query');

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

    const filters: SQL[] = [eq(devices.appId, query.appId)];

    if (query.platform) {
      filters.push(eq(devices.platform, query.platform));
    }

    if (query.identifier) {
      const searchCondition = or(
        eq(devices.identifier, query.identifier),
        eq(devices.deviceId, query.identifier)
      );
      if (searchCondition) {
        filters.push(searchCondition);
      }
    }

    const whereClause = buildFilters({
      filters,
      startDateColumn: devices.firstSeen,
      startDateValue: query.startDate,
      endDateColumn: devices.firstSeen,
      endDateValue: query.endDate,
    });

    const [devicesList, [{ count: totalCount }]] = await Promise.all([
      db
        .select({
          deviceId: devices.deviceId,
          identifier: devices.identifier,
          platform: devices.platform,
          country: devices.country,
        })
        .from(devices)
        .where(whereClause)
        .orderBy(desc(devices.firstSeen))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: count() }).from(devices).where(whereClause),
    ]);

    return c.json(
      {
        devices: devicesList,
        pagination: formatPaginationResponse(totalCount, page, pageSize),
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[Device.List] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to fetch devices',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

// biome-ignore lint/suspicious/noExplicitAny: OpenAPI handler type inference issue with union response types
deviceWebRouter.openapi(getDeviceTimeseriesRoute, async (c: any) => {
  try {
    const query = c.req.valid('query');
    const { appId, startDate, endDate, metric = 'dau' } = query;

    const dateRangeValidation = validateDateRange(c, startDate, endDate);
    if (!dateRangeValidation.success) {
      return dateRangeValidation.response;
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
        LEFT JOIN sessions_analytics s ON DATE(s.last_activity_at) = ds.date
        LEFT JOIN devices d ON s.device_id = d.device_id AND d.app_id = ${appId}
        WHERE ds.date <= CURRENT_DATE
        GROUP BY ds.date
        ORDER BY ds.date
      `);

      const data = result.rows.map((row) => ({
        date: row.date,
        activeUsers: Number(row.activeUsers),
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
    console.error('[Device.Timeseries] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to fetch device timeseries',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

// biome-ignore lint/suspicious/noExplicitAny: OpenAPI handler type inference issue with union response types
deviceWebRouter.openapi(getDeviceRoute, async (c: any) => {
  try {
    const { deviceId } = c.req.param();
    const query = c.req.valid('query');

    const [deviceWithSession] = await db
      .select({
        deviceId: devices.deviceId,
        identifier: devices.identifier,
        model: devices.model,
        osVersion: devices.osVersion,
        platform: devices.platform,
        appVersion: devices.appVersion,
        country: devices.country,
        firstSeen: devices.firstSeen,
        lastActivityAt: sessions.lastActivityAt,
      })
      .from(devices)
      .leftJoin(sessions, eq(devices.deviceId, sessions.deviceId))
      .where(
        and(eq(devices.deviceId, deviceId), eq(devices.appId, query.appId))
      )
      .orderBy(desc(sessions.lastActivityAt))
      .limit(1);

    if (!deviceWithSession) {
      return c.json(
        {
          code: ErrorCode.NOT_FOUND,
          detail: 'Device not found',
        },
        HttpStatus.NOT_FOUND
      );
    }

    const [{ count: totalSessions }] = await db
      .select({ count: count() })
      .from(sessions)
      .where(eq(sessions.deviceId, deviceId));

    return c.json(
      {
        deviceId: deviceWithSession.deviceId,
        identifier: deviceWithSession.identifier,
        model: deviceWithSession.model,
        osVersion: deviceWithSession.osVersion,
        platform: deviceWithSession.platform,
        appVersion: deviceWithSession.appVersion,
        country: deviceWithSession.country,
        firstSeen: deviceWithSession.firstSeen.toISOString(),
        lastActivityAt: deviceWithSession.lastActivityAt
          ? deviceWithSession.lastActivityAt.toISOString()
          : null,
        totalSessions: Number(totalSessions),
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[Device.Get] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to fetch device',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

export { deviceSdkRouter, deviceWebRouter };
