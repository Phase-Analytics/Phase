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
    identifier: z.string().nullable().openapi({ example: 'user@example.com' }),
    model: z.string().nullable().openapi({ example: 'iPhone 15 Pro' }),
    osVersion: z.string().nullable().openapi({ example: '17.0.1' }),
    platform: z.string().nullable().openapi({ example: 'ios' }),
    appVersion: z.string().nullable().openapi({ example: '1.2.3' }),
    firstSeen: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-01T00:00:00Z' }),
  })
  .openapi('Device') satisfies z.ZodType<
  Omit<Device, 'firstSeen' | 'appId'> & { firstSeen: string }
>;

export const createDeviceRequestSchema = z
  .object({
    deviceId: z.string().openapi({ example: 'device_abc123' }),
    identifier: z.string().nullish().openapi({ example: 'user@example.com' }),
    model: z.string().nullish().openapi({ example: 'iPhone 15 Pro' }),
    osVersion: z.string().nullish().openapi({ example: '17.0.1' }),
    platform: z.string().nullish().openapi({ example: 'ios' }),
    appVersion: z.string().nullish().openapi({ example: '1.2.3' }),
  })
  .openapi('CreateDeviceRequest');

export const listDevicesQuerySchema = paginationQuerySchema
  .merge(dateFilterQuerySchema)
  .extend({
    platform: z.string().optional().openapi({ example: 'ios' }),
    appId: z.string().openapi({ example: '12345678901234' }),
  })
  .openapi('ListDevicesQuery');

export const deviceDetailSchema = z
  .object({
    deviceId: z.string().openapi({ example: 'device_abc123' }),
    identifier: z.string().nullable().openapi({ example: 'user@example.com' }),
    model: z.string().nullable().openapi({ example: 'iPhone 15 Pro' }),
    osVersion: z.string().nullable().openapi({ example: '17.0.1' }),
    platform: z.string().nullable().openapi({ example: 'ios' }),
    appVersion: z.string().nullable().openapi({ example: '1.2.3' }),
    firstSeen: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-01T00:00:00Z' }),
    lastActivity: z
      .string()
      .datetime()
      .nullable()
      .openapi({ example: '2024-01-01T12:30:00Z' }),
  })
  .openapi('DeviceDetail');

export const getDeviceQuerySchema = z
  .object({
    appId: z.string().openapi({ example: '12345678901234' }),
  })
  .openapi('GetDeviceQuery');

export const devicesListResponseSchema = z
  .object({
    devices: z.array(deviceSchema),
    pagination: paginationSchema,
    platformStats: z.record(z.string(), z.number()).openapi({
      example: { ios: 25, android: 18, web: 3 },
    }),
  })
  .openapi('DevicesListResponse');

export type DeviceSchema = z.infer<typeof deviceSchema>;
export type DeviceDetailSchema = z.infer<typeof deviceDetailSchema>;
export type GetDeviceQuery = z.infer<typeof getDeviceQuerySchema>;
export type CreateDeviceRequest = z.infer<typeof createDeviceRequestSchema>;
export type ListDevicesQuery = z.infer<typeof listDevicesQuerySchema>;
export type DevicesListResponse = z.infer<typeof devicesListResponseSchema>;
