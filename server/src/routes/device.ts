import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { and, count, desc, eq, type SQL, sql } from 'drizzle-orm';
import { db, devices, sessions } from '@/db';
import type { App, Session, User } from '@/db/schema';
import {
  requireAppKey,
  requireAuth,
  verifyAppOwnership,
} from '@/lib/middleware';
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
  deviceSchema,
  devicesListResponseSchema,
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
  description: 'List devices for a specific API key',
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
  description: 'Get device details with last activity',
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

deviceWebRouter.use('*', requireAuth, verifyAppOwnership);

deviceWebRouter.all('*', async (c, next) => {
  const method = c.req.method;
  const allowedMethods = ['GET'];

  if (!allowedMethods.includes(method)) {
    return methodNotAllowed(c, allowedMethods);
  }

  return await next();
});

// biome-ignore lint/suspicious/noExplicitAny: OpenAPI handler type inference issue with union response types
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Device upsert requires branching for insert vs update logic
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

    const whereClause = buildFilters({
      filters,
      startDateColumn: devices.firstSeen,
      startDateValue: query.startDate,
      endDateColumn: devices.firstSeen,
      endDateValue: query.endDate,
    });

    const [devicesList, [{ count: totalCount }], platformStatsResult] =
      await Promise.all([
        db
          .select()
          .from(devices)
          .where(whereClause)
          .orderBy(desc(devices.firstSeen))
          .limit(pageSize)
          .offset(offset),
        db.select({ count: count() }).from(devices).where(whereClause),
        db.execute<{ platform: string; count: number }>(sql`
          SELECT
            COALESCE(platform, 'unknown') as platform,
            COUNT(*)::int as count
          FROM devices
          WHERE app_id = ${query.appId}
          ${query.platform ? sql`AND platform = ${query.platform}` : sql``}
          ${query.startDate ? sql`AND first_seen >= ${query.startDate}` : sql``}
          ${query.endDate ? sql`AND first_seen <= ${query.endDate}` : sql``}
          GROUP BY platform
        `),
      ]);

    const formattedDevices = devicesList.map((device) => ({
      deviceId: device.deviceId,
      identifier: device.identifier,
      model: device.model,
      osVersion: device.osVersion,
      platform: device.platform,
      appVersion: device.appVersion,
      firstSeen: device.firstSeen.toISOString(),
    }));

    const platformStats: Record<string, number> = {};
    for (const row of platformStatsResult.rows) {
      platformStats[row.platform] = Number(row.count);
    }

    return c.json(
      {
        devices: formattedDevices,
        pagination: formatPaginationResponse(totalCount, page, pageSize),
        platformStats,
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

    return c.json(
      {
        deviceId: deviceWithSession.deviceId,
        identifier: deviceWithSession.identifier,
        model: deviceWithSession.model,
        osVersion: deviceWithSession.osVersion,
        platform: deviceWithSession.platform,
        appVersion: deviceWithSession.appVersion,
        firstSeen: deviceWithSession.firstSeen.toISOString(),
        lastActivity: deviceWithSession.lastActivityAt
          ? deviceWithSession.lastActivityAt.toISOString()
          : null,
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
