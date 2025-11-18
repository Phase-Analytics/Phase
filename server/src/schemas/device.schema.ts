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
    appId: z.string().openapi({ example: '123456789012345' }),
  })
  .openapi('ListDevicesQuery');

export const deviceListItemSchema = z
  .object({
    deviceId: z.string().openapi({ example: 'device_abc123' }),
    identifier: z.string().nullable().openapi({ example: 'user@example.com' }),
    platform: z.string().nullable().openapi({ example: 'ios' }),
  })
  .openapi('DeviceListItem');

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
    totalSessions: z.number().int().min(0).openapi({ example: 42 }),
  })
  .openapi('DeviceDetail');

export const getDeviceQuerySchema = z
  .object({
    appId: z.string().openapi({ example: '123456789012345' }),
  })
  .openapi('GetDeviceQuery');

export const devicesListResponseSchema = z
  .object({
    devices: z.array(deviceListItemSchema),
    pagination: paginationSchema,
  })
  .openapi('DevicesListResponse');

export const deviceOverviewQuerySchema = z
  .object({
    appId: z.string().openapi({ example: '123456789012345' }),
  })
  .openapi('DeviceOverviewQuery');

export const deviceOverviewResponseSchema = z
  .object({
    totalDevices: z.number().int().min(0).openapi({ example: 1250 }),
    activeDevices24h: z.number().int().min(0).openapi({ example: 342 }),
    platformStats: z.record(z.string(), z.number()).openapi({
      example: { ios: 650, android: 480, web: 120 },
    }),
  })
  .openapi('DeviceOverviewResponse');

export const deviceLiveQuerySchema = z
  .object({
    appId: z.string().openapi({ example: '123456789012345' }),
  })
  .openapi('DeviceLiveQuery');

export const deviceLiveResponseSchema = z
  .object({
    activeNow: z.number().int().min(0).openapi({ example: 23 }),
    devices: z
      .array(
        z.object({
          deviceId: z.string().openapi({ example: 'device_abc123' }),
          identifier: z
            .string()
            .nullable()
            .openapi({ example: 'user@example.com' }),
          platform: z.string().nullable().openapi({ example: 'ios' }),
          lastActivityAt: z
            .string()
            .datetime()
            .openapi({ example: '2024-01-01T12:30:00Z' }),
        })
      )
      .openapi({ example: [] }),
  })
  .openapi('DeviceLiveResponse');

export type DeviceSchema = z.infer<typeof deviceSchema>;
export type DeviceListItemSchema = z.infer<typeof deviceListItemSchema>;
export type DeviceDetailSchema = z.infer<typeof deviceDetailSchema>;
export type GetDeviceQuery = z.infer<typeof getDeviceQuerySchema>;
export type CreateDeviceRequest = z.infer<typeof createDeviceRequestSchema>;
export type ListDevicesQuery = z.infer<typeof listDevicesQuerySchema>;
export type DevicesListResponse = z.infer<typeof devicesListResponseSchema>;
export type DeviceOverviewQuery = z.infer<typeof deviceOverviewQuerySchema>;
export type DeviceOverviewResponse = z.infer<
  typeof deviceOverviewResponseSchema
>;
export type DeviceLiveQuery = z.infer<typeof deviceLiveQuerySchema>;
export type DeviceLiveResponse = z.infer<typeof deviceLiveResponseSchema>;
