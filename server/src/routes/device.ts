import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { count, desc, eq, type SQL } from 'drizzle-orm';
import { db, devices } from '@/db';
import { internalServerError } from '@/lib/response';
import { errorResponses, paginationSchema } from '@/lib/schemas';
import {
  buildFilters,
  formatPaginationResponse,
  validateApiKey,
  validatePagination,
} from '@/lib/validators';
import { HttpStatus } from '@/types/codes';

const deviceSchema = z.object({
  deviceId: z.string(),
  apikeyId: z.string(),
  identifier: z.string().nullable(),
  brand: z.string().nullable(),
  osVersion: z.string().nullable(),
  platform: z.string().nullable(),
  firstSeen: z.string(),
});

const createDeviceRequestSchema = z.object({
  deviceId: z.string(),
  apikeyId: z.string(),
  identifier: z.string().optional(),
  brand: z.string().optional(),
  osVersion: z.string().optional(),
  platform: z.string().optional(),
});

const devicesListResponseSchema = z.object({
  devices: z.array(deviceSchema),
  pagination: paginationSchema,
});

const createDeviceRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['device'],
  description: 'Create or update a device (upsert)',
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
  request: {
    query: z.object({
      apikeyId: z.string(),
      page: z.string().optional().default('1'),
      pageSize: z.string().optional().default('50'),
      platform: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }),
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

const deviceRouter = new OpenAPIHono();

deviceRouter.openapi(createDeviceRoute, async (c) => {
  try {
    const body = c.req.valid('json');

    const apikeyValidation = await validateApiKey(c, body.apikeyId);
    if (!apikeyValidation.success) {
      return apikeyValidation.response;
    }

    const existingDevice = await db.query.devices.findFirst({
      where: (table, { eq: eqFn }) => eqFn(table.deviceId, body.deviceId),
    });

    let device: typeof devices.$inferSelect;

    if (existingDevice) {
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
          apikeyId: body.apikeyId,
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
        apikeyId: device.apikeyId,
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
    return internalServerError(c, 'Failed to create or update device');
  }
});

deviceRouter.openapi(getDevicesRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const { apikeyId } = query;

    const apikeyValidation = await validateApiKey(c, apikeyId);
    if (!apikeyValidation.success) {
      return apikeyValidation.response;
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

    const filters: SQL[] = [eq(devices.apikeyId, apikeyId)];

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
      apikeyId: device.apikeyId,
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
    return internalServerError(c, 'Failed to fetch devices');
  }
});

export default deviceRouter;
