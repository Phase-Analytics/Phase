import {
  CreateDeviceRequestSchema,
  DeviceSchema,
  ErrorCode,
  ErrorResponseSchema,
  HttpStatus,
  type Platform,
} from '@phase/shared';
import { eq } from 'drizzle-orm';
import { Elysia } from 'elysia';
import { db, devices } from '@/db';
import { getLocationFromIP } from '@/lib/geolocation';
import { sdkAuthPlugin } from '@/lib/middleware';
import { sseManager } from '@/lib/sse-manager';

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

export const deviceSdkRouter = new Elysia({ prefix: '/devices' })
  .use(sdkAuthPlugin)
  .post(
    '/',
    async ({ body, app, set, request }) => {
      try {
        const ip =
          request.headers.get('cf-connecting-ip') ??
          request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
          request.headers.get('x-real-ip') ??
          '';

        let country: string | null = null;
        let city: string | null = null;

        const existingDevice = await db.query.devices.findFirst({
          where: (table, { eq: eqFn }) => eqFn(table.deviceId, body.deviceId),
        });

        let device: typeof devices.$inferSelect;

        if (existingDevice) {
          if (existingDevice.appId !== app.id) {
            set.status = HttpStatus.FORBIDDEN;
            return {
              code: ErrorCode.FORBIDDEN,
              detail: 'You do not have permission to update this device',
            };
          }

          [device] = await db
            .update(devices)
            .set({
              osVersion: body.osVersion ?? existingDevice.osVersion,
              platform: body.platform ?? existingDevice.platform,
              locale: body.locale ?? existingDevice.locale,
              model: body.model ?? existingDevice.model,
              properties: body.properties ?? existingDevice.properties,
            })
            .where(eq(devices.deviceId, body.deviceId))
            .returning();
        } else {
          if (ip && !body.disableGeolocation) {
            const location = await getLocationFromIP(ip);
            country = location.countryCode;
            city = location.city;
          }

          [device] = await db
            .insert(devices)
            .values({
              deviceId: body.deviceId,
              appId: app.id,
              osVersion: body.osVersion ?? null,
              platform: body.platform ?? null,
              locale: body.locale ?? null,
              model: body.model ?? null,
              country: country ?? null,
              city: city ?? null,
              properties: body.properties ?? null,
            })
            .returning();
        }

        sseManager.pushDevice(app.id, {
          deviceId: device.deviceId,
          country: device.country,
          platform: device.platform,
        });

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
        };
      } catch (error) {
        console.error('[Device.Upsert] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to create or update device',
        };
      }
    },
    {
      body: CreateDeviceRequestSchema,
      response: {
        200: DeviceSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  );
