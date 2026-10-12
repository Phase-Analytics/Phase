import {
  CreateDeviceRequestSchema,
  DeviceSchema,
  ErrorCode,
  ErrorResponseSchema,
  HttpStatus,
  type Platform,
  resolveDeviceModel,
} from '@phase/shared';
import { Elysia } from 'elysia';
import { getClientIp, getSocketAddress } from '@/lib/client-ip';
import { upsertDevice } from '@/lib/ingest-store';
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
    async ({ body, app, set, request, server }) => {
      try {
        const ip = getClientIp(request, getSocketAddress(request, server));
        const result = await upsertDevice(body, app.id, ip);

        if (result.status === 'forbidden') {
          set.status = HttpStatus.FORBIDDEN;
          return {
            code: ErrorCode.FORBIDDEN,
            detail: 'You do not have permission to update this device',
          };
        }

        const { device, inserted } = result;
        if (inserted) {
          sseManager.pushDevice(app.id, {
            deviceId: device.deviceId,
            country: device.country,
            platform: device.platform,
          });
        }

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
