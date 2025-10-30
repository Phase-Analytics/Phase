import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, count, desc, eq, gte, lte } from 'drizzle-orm';
import { db, devices } from '@/db';
import { badRequest, internalServerError } from '@/lib/response';
import { errorResponses, paginationSchema } from '@/lib/schemas';
import { ErrorCode, HttpStatus } from '@/types/codes';

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

    const apikey = await db.query.apikey.findFirst({
      where: (table, { eq: eqFn }) => eqFn(table.id, body.apikeyId),
    });

    if (!apikey) {
      return badRequest(c, ErrorCode.VALIDATION_ERROR, 'API key not found');
    }

    const existingDevice = await db.query.devices.findFirst({
      where: (table, { eq: eqFn }) => eqFn(table.deviceId, body.deviceId),
    });

    if (existingDevice) {
      const [updatedDevice] = await db
        .update(devices)
        .set({
          identifier: body.identifier ?? existingDevice.identifier,
          brand: body.brand ?? existingDevice.brand,
          osVersion: body.osVersion ?? existingDevice.osVersion,
          platform: body.platform ?? existingDevice.platform,
        })
        .where(eq(devices.deviceId, body.deviceId))
        .returning();

      return c.json(
        {
          deviceId: updatedDevice.deviceId,
          apikeyId: updatedDevice.apikeyId,
          identifier: updatedDevice.identifier,
          brand: updatedDevice.brand,
          osVersion: updatedDevice.osVersion,
          platform: updatedDevice.platform,
          firstSeen: updatedDevice.firstSeen.toISOString(),
        },
        HttpStatus.OK
      );
    }

    const [newDevice] = await db
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

    return c.json(
      {
        deviceId: newDevice.deviceId,
        apikeyId: newDevice.apikeyId,
        identifier: newDevice.identifier,
        brand: newDevice.brand,
        osVersion: newDevice.osVersion,
        platform: newDevice.platform,
        firstSeen: newDevice.firstSeen.toISOString(),
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[Device] Upsert error:', error);
    return internalServerError(c, 'Failed to create or update device');
  }
});

deviceRouter.openapi(getDevicesRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const { apikeyId } = query;

    const apikey = await db.query.apikey.findFirst({
      where: (table, { eq: eqFn }) => eqFn(table.id, apikeyId),
    });

    if (!apikey) {
      return badRequest(c, ErrorCode.VALIDATION_ERROR, 'API key not found');
    }

    const page = Number.parseInt(query.page, 10);
    const pageSize = Number.parseInt(query.pageSize, 10);

    if (Number.isNaN(page) || page < 1) {
      return badRequest(
        c,
        ErrorCode.VALIDATION_ERROR,
        'Invalid page parameter: must be a positive integer'
      );
    }

    if (Number.isNaN(pageSize) || pageSize < 1) {
      return badRequest(
        c,
        ErrorCode.VALIDATION_ERROR,
        'Invalid pageSize parameter: must be a positive integer'
      );
    }

    const offset = (page - 1) * pageSize;

    const filters: ReturnType<typeof eq | typeof gte | typeof lte>[] = [];

    filters.push(eq(devices.apikeyId, apikeyId));

    if (query.platform) {
      filters.push(eq(devices.platform, query.platform));
    }

    if (query.startDate) {
      filters.push(gte(devices.firstSeen, new Date(query.startDate)));
    }

    if (query.endDate) {
      filters.push(lte(devices.firstSeen, new Date(query.endDate)));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

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

    const totalPages = Math.ceil(totalCount / pageSize);

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
        pagination: {
          total: totalCount,
          page,
          pageSize,
          totalPages,
        },
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[Device] List error:', error);
    return internalServerError(c, 'Failed to fetch devices');
  }
});

export default deviceRouter;
