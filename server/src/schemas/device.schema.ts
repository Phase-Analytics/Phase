import { z } from '@hono/zod-openapi';
import type { Device } from '@/db/schema';
import {
  dateFilterQuerySchema,
  paginationQuerySchema,
  paginationSchema,
} from './common.schema';

export const deviceSchema = z
  .object({
    deviceId: z.string().openapi({ example: 'device_abc123' }),
    apikeyId: z.string().openapi({ example: 'apikey_xyz789' }),
    identifier: z.string().nullable().openapi({ example: 'user@example.com' }),
    brand: z.string().nullable().openapi({ example: 'Apple' }),
    osVersion: z.string().nullable().openapi({ example: '17.0.1' }),
    platform: z.string().nullable().openapi({ example: 'iOS' }),
    firstSeen: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-01T00:00:00Z' }),
  })
  .openapi('Device') satisfies z.ZodType<
  Omit<Device, 'firstSeen'> & { firstSeen: string }
>;

export const createDeviceRequestSchema = z
  .object({
    deviceId: z.string().openapi({ example: 'device_abc123' }),
    apikeyId: z.string().openapi({ example: 'apikey_xyz789' }),
    identifier: z.string().nullish().openapi({ example: 'user@example.com' }),
    brand: z.string().nullish().openapi({ example: 'Apple' }),
    osVersion: z.string().nullish().openapi({ example: '17.0.1' }),
    platform: z.string().nullish().openapi({ example: 'iOS' }),
  })
  .openapi('CreateDeviceRequest');

export const listDevicesQuerySchema = paginationQuerySchema
  .merge(dateFilterQuerySchema)
  .extend({
    apikeyId: z.string().openapi({ example: 'apikey_xyz789' }),
    platform: z.string().optional().openapi({ example: 'iOS' }),
  })
  .openapi('ListDevicesQuery');

export const devicesListResponseSchema = z
  .object({
    devices: z.array(deviceSchema),
    pagination: paginationSchema,
  })
  .openapi('DevicesListResponse');

export type DeviceSchema = z.infer<typeof deviceSchema>;
export type CreateDeviceRequest = z.infer<typeof createDeviceRequestSchema>;
export type ListDevicesQuery = z.infer<typeof listDevicesQuerySchema>;
export type DevicesListResponse = z.infer<typeof devicesListResponseSchema>;
