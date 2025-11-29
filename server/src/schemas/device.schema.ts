import { z } from '@hono/zod-openapi';
import type { Device } from '@/db/schema';
import {
  dateFilterQuerySchema,
  paginationQuerySchema,
  paginationSchema,
} from './common.schema';

export const platformEnum = z.enum(['ios', 'android', 'web']);

export const deviceSchema = z
  .object({
    deviceId: z.string().openapi({ example: 'device_abc123' }),
    identifier: z.string().nullable().openapi({ example: 'user@example.com' }),
    model: z.string().nullable().openapi({ example: 'iPhone 15 Pro' }),
    osVersion: z.string().nullable().openapi({ example: '17.0.1' }),
    platform: platformEnum.nullable().openapi({ example: 'ios' }),
    appVersion: z.string().nullable().openapi({ example: '1.2.3' }),
    country: z.string().nullable().openapi({ example: 'US' }),
    city: z.string().nullable().openapi({ example: 'New York' }),
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
    platform: platformEnum.nullish().openapi({ example: 'ios' }),
    appVersion: z.string().nullish().openapi({ example: '1.2.3' }),
  })
  .openapi('CreateDeviceRequest');

export const listDevicesQuerySchema = paginationQuerySchema
  .merge(dateFilterQuerySchema)
  .extend({
    platform: platformEnum.optional().openapi({ example: 'ios' }),
    identifier: z.string().optional().openapi({ example: 'user@example.com' }),
    appId: z.string().openapi({ example: '123456789012345' }),
  })
  .openapi('ListDevicesQuery');

export const deviceListItemSchema = z
  .object({
    deviceId: z.string().openapi({ example: 'device_abc123' }),
    identifier: z.string().nullable().openapi({ example: 'user@example.com' }),
    platform: platformEnum.nullable().openapi({ example: 'ios' }),
    country: z.string().nullable().openapi({ example: 'US' }),
    city: z.string().nullable().openapi({ example: 'New York' }),
    firstSeen: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-01T00:00:00Z' }),
  })
  .openapi('DeviceListItem');

export const deviceDetailSchema = z
  .object({
    deviceId: z.string().openapi({ example: 'device_abc123' }),
    identifier: z.string().nullable().openapi({ example: 'user@example.com' }),
    model: z.string().nullable().openapi({ example: 'iPhone 15 Pro' }),
    osVersion: z.string().nullable().openapi({ example: '17.0.1' }),
    platform: platformEnum.nullable().openapi({ example: 'ios' }),
    appVersion: z.string().nullable().openapi({ example: '1.2.3' }),
    country: z.string().nullable().openapi({ example: 'US' }),
    city: z.string().nullable().openapi({ example: 'New York' }),
    firstSeen: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-01T00:00:00Z' }),
    lastActivityAt: z
      .string()
      .datetime()
      .nullable()
      .openapi({ example: '2024-01-01T12:30:00Z' }),
    totalSessions: z.number().int().min(0).openapi({ example: 42 }),
    avgSessionDuration: z.number().nullable().openapi({
      example: 1250.5,
      description: 'Average session duration in seconds',
    }),
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

export const overviewLimitEnum = z.enum(['top3', 'all']);

export const deviceOverviewQuerySchema = z
  .object({
    appId: z.string().openapi({ example: '123456789012345' }),
  })
  .openapi('DeviceOverviewQuery');

export const devicePlatformOverviewQuerySchema = z
  .object({
    appId: z.string().openapi({ example: '123456789012345' }),
  })
  .openapi('DevicePlatformOverviewQuery');

export const deviceLocationOverviewQuerySchema = z
  .object({
    appId: z.string().openapi({ example: '123456789012345' }),
    limit: overviewLimitEnum.optional().default('all').openapi({
      example: 'all',
      description:
        'Limit results: "top3" shows top 3 items, "all" shows all items (default)',
    }),
  })
  .openapi('DeviceLocationOverviewQuery');

export const deviceOverviewResponseSchema = z
  .object({
    totalDevices: z.number().int().min(0).openapi({ example: 1250 }),
    activeDevices24h: z.number().int().min(0).openapi({ example: 342 }),
    platformStats: z.record(z.string(), z.number()).openapi({
      example: { ios: 650, android: 480, web: 120 },
      description:
        'Platform distribution - top 3 platforms by count (ios, android, web only, null values excluded).',
    }),
    countryStats: z.record(z.string(), z.number()).openapi({
      example: { US: 450, GB: 320, TR: 280 },
      description:
        'Country distribution - top 3 countries by count (null values excluded).',
    }),
    totalDevicesChange24h: z
      .number()
      .openapi({ example: 0.4, description: 'Percentage change in last 24h' }),
    activeDevicesChange24h: z
      .number()
      .openapi({ example: 4.2, description: 'Percentage change in last 24h' }),
  })
  .openapi('DeviceOverviewResponse');

export const devicePlatformOverviewResponseSchema = z
  .object({
    totalDevices: z.number().int().min(0).openapi({ example: 1250 }),
    activeDevices24h: z.number().int().min(0).openapi({ example: 342 }),
    platformStats: z.record(z.string(), z.number()).openapi({
      example: { ios: 650, android: 480, web: 120 },
      description:
        'Platform distribution - all 3 platforms (ios, android, web), sorted by count.',
    }),
    totalDevicesChange24h: z
      .number()
      .openapi({ example: 0.4, description: 'Percentage change in last 24h' }),
    activeDevicesChange24h: z
      .number()
      .openapi({ example: 4.2, description: 'Percentage change in last 24h' }),
  })
  .openapi('DevicePlatformOverviewResponse');

export const deviceLocationOverviewResponseSchema = z
  .object({
    totalDevices: z.number().int().min(0).openapi({ example: 1250 }),
    countryStats: z.record(z.string(), z.number()).openapi({
      example: { US: 450, GB: 320, TR: 280 },
      description:
        'Country distribution - top 3 countries by count (null values excluded).',
    }),
    cityStats: z.record(z.string(), z.number()).openapi({
      example: { 'New York': 180, London: 150, Istanbul: 130 },
      description:
        'City distribution - top 3 cities by count (null values excluded).',
    }),
  })
  .openapi('DeviceLocationOverviewResponse');

export const deviceTimeseriesMetricEnum = z.enum(['dau', 'total']);

export const deviceTimeseriesQuerySchema = z
  .object({
    appId: z.string().openapi({ example: '123456789012345' }),
    startDate: z
      .string()
      .datetime()
      .optional()
      .openapi({ example: '2024-01-01T00:00:00Z' }),
    endDate: z
      .string()
      .datetime()
      .optional()
      .openapi({ example: '2024-01-31T23:59:59Z' }),
    metric: deviceTimeseriesMetricEnum.optional().default('dau').openapi({
      example: 'dau',
      description:
        'Metric type: dau (Daily Active Users) or total (Total Users)',
    }),
  })
  .openapi('DeviceTimeseriesQuery');

export const deviceTimeseriesDataPointSchema = z
  .object({
    date: z.string().openapi({ example: '2024-01-01' }),
    activeUsers: z.number().int().min(0).optional().openapi({ example: 342 }),
    totalUsers: z.number().int().min(0).optional().openapi({ example: 1250 }),
  })
  .openapi('DeviceTimeseriesDataPoint');

export const deviceTimeseriesResponseSchema = z
  .object({
    data: z.array(deviceTimeseriesDataPointSchema),
  })
  .openapi('DeviceTimeseriesResponse');

export const deviceLiveQuerySchema = z
  .object({
    appId: z.string().openapi({ example: '123456789012345' }),
  })
  .openapi('DeviceLiveQuery');

export const deviceLiveResponseSchema = z
  .object({
    activeNow: z.number().int().min(0).openapi({ example: 23 }),
  })
  .openapi('DeviceLiveResponse');

export type Platform = z.infer<typeof platformEnum>;
export type OverviewLimit = z.infer<typeof overviewLimitEnum>;
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
export type DevicePlatformOverviewQuery = z.infer<
  typeof devicePlatformOverviewQuerySchema
>;
export type DevicePlatformOverviewResponse = z.infer<
  typeof devicePlatformOverviewResponseSchema
>;
export type DeviceLocationOverviewQuery = z.infer<
  typeof deviceLocationOverviewQuerySchema
>;
export type DeviceLocationOverviewResponse = z.infer<
  typeof deviceLocationOverviewResponseSchema
>;
export type DeviceLiveQuery = z.infer<typeof deviceLiveQuerySchema>;
export type DeviceLiveResponse = z.infer<typeof deviceLiveResponseSchema>;
export type DeviceTimeseriesQuery = z.infer<typeof deviceTimeseriesQuerySchema>;
export type DeviceTimeseriesDataPoint = z.infer<
  typeof deviceTimeseriesDataPointSchema
>;
export type DeviceTimeseriesResponse = z.infer<
  typeof deviceTimeseriesResponseSchema
>;
