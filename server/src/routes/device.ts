import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { count, desc, eq, type SQL } from 'drizzle-orm';
import { db, devices } from '@/db';
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
  validatePagination,
} from '@/lib/validators';
import {
  createDeviceRequestSchema,
  deviceSchema,
  devicesListResponseSchema,
  ErrorCode,
  errorResponses,
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

const deviceSdkRouter = new OpenAPIHono<{
  Variables: {
    apiKey: ApiKey;
    userId: string;
  };
}>();

deviceSdkRouter.use('*', requireApiKey);

const deviceWebRouter = new OpenAPIHono<{
  Variables: {
    user: User;
    session: Session;
    apiKey: ApiKey;
  };
}>();

deviceWebRouter.use('*', requireAuth, verifyApiKeyOwnership);

// biome-ignore lint/suspicious/noExplicitAny: OpenAPI handler type inference issue with union response types
deviceSdkRouter.openapi(createDeviceRoute, async (c: any) => {
  try {
    const body = c.req.valid('json');
    const apiKey = c.get('apiKey');

    if (!apiKey?.id) {
      return c.json(
        {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'API key is required',
        },
        HttpStatus.UNAUTHORIZED
      );
    }

    const existingDevice = await db.query.devices.findFirst({
      where: (table, { eq: eqFn }) => eqFn(table.deviceId, body.deviceId),
    });

    let device: typeof devices.$inferSelect;

    if (existingDevice) {
      if (existingDevice.apiKeyId !== apiKey.id) {
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
          brand: body.brand ?? existingDevice.brand,
          osVersion: body.osVersion ?? existingDevice.osVersion,
          platform: body.platform ?? existingDevice.platform,
        })
        .where(eq(devices.deviceId, body.deviceId))
        .returning();
    } else {
      [device] = await db
        .insert(devices)
        .values({
          deviceId: body.deviceId,
          apiKeyId: apiKey.id,
          identifier: body.identifier ?? null,
          brand: body.brand ?? null,
          osVersion: body.osVersion ?? null,
          platform: body.platform ?? null,
        })
        .returning();
    }

    return c.json(
      {
        deviceId: device.deviceId,
        identifier: device.identifier,
        brand: device.brand,
        osVersion: device.osVersion,
        platform: device.platform,
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

    const filters: SQL[] = [eq(devices.apiKeyId, query.apiKeyId)];

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

    const [devicesList, [{ count: totalCount }]] = await Promise.all([
      db
        .select()
        .from(devices)
        .where(whereClause)
        .orderBy(desc(devices.firstSeen))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: count() }).from(devices).where(whereClause),
    ]);

    const formattedDevices = devicesList.map((device) => ({
      deviceId: device.deviceId,
      identifier: device.identifier,
      brand: device.brand,
      osVersion: device.osVersion,
      platform: device.platform,
      firstSeen: device.firstSeen.toISOString(),
    }));

    return c.json(
      {
        devices: formattedDevices,
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

const deviceRouter = new OpenAPIHono();

deviceRouter.all('*', async (c, next) => {
  const method = c.req.method;
  const allowedMethods = ['GET', 'POST'];

  if (!allowedMethods.includes(method)) {
    return methodNotAllowed(c, allowedMethods);
  }

  await next();
});

deviceRouter.route('/', deviceSdkRouter);
deviceRouter.route('/', deviceWebRouter);

export default deviceRouter;
