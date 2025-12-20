import { z } from 'zod';
import { DEVICE_ID, LOCALE, VERSION } from '../constants/validation';
import { PaginationMetaSchema } from './common';

export const PlatformSchema = z.enum(['ios', 'android', 'unknown']);
export const DeviceTypeSchema = z.enum([
  'phone',
  'tablet',
  'desktop',
  'unknown',
]);

export const DevicePropertiesSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()])
);

export const PropertyOperatorSchema = z.enum([
  'eq',
  'neq',
  'gt',
  'lt',
  'gte',
  'lte',
  'contains',
  'startsWith',
  'endsWith',
]);

export const PropertySearchConditionSchema = z.object({
  key: z.string().min(1).max(128),
  operator: PropertyOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
});

export const PropertySearchFilterSchema = z
  .array(PropertySearchConditionSchema)
  .max(10);

export type Platform = z.infer<typeof PlatformSchema>;
export type DeviceType = z.infer<typeof DeviceTypeSchema>;
export type DeviceProperties = z.infer<typeof DevicePropertiesSchema>;
export type PropertyOperator = z.infer<typeof PropertyOperatorSchema>;
export type PropertySearchCondition = z.infer<
  typeof PropertySearchConditionSchema
>;
export type PropertySearchFilter = z.infer<typeof PropertySearchFilterSchema>;

export const DeviceSchema = z.object({
  deviceId: z.string(),
  osVersion: z.string().nullable(),
  platform: PlatformSchema.nullable(),
  locale: z.string().nullable(),
  model: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  properties: DevicePropertiesSchema.nullable(),
  firstSeen: z.string().datetime(),
});

export const CreateDeviceRequestSchema = z.object({
  deviceId: z
    .string()
    .min(DEVICE_ID.MIN_LENGTH)
    .max(DEVICE_ID.MAX_LENGTH)
    .regex(DEVICE_ID.PATTERN),
  osVersion: z
    .string()
    .max(VERSION.OS_VERSION_MAX_LENGTH)
    .nullable()
    .optional(),
  platform: PlatformSchema.nullable().optional(),
  locale: z.string().max(LOCALE.MAX_LENGTH).nullable().optional(),
  model: z.string().max(128).nullable().optional(),
  properties: DevicePropertiesSchema.optional(),
  disableGeolocation: z.boolean().optional(),
});

export const DeviceListItemSchema = z.object({
  deviceId: z.string(),
  platform: PlatformSchema.nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  firstSeen: z.string().datetime(),
});

export const DeviceDetailSchema = z.object({
  deviceId: z.string(),
  osVersion: z.string().nullable(),
  platform: PlatformSchema.nullable(),
  locale: z.string().nullable(),
  model: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  properties: DevicePropertiesSchema.nullable(),
  firstSeen: z.string().datetime(),
  lastActivityAt: z.string().datetime().nullable(),
});

export const DevicesListResponseSchema = z.object({
  devices: z.array(DeviceListItemSchema),
  pagination: PaginationMetaSchema,
});

export const DeviceOverviewResponseSchema = z.object({
  totalDevices: z.number().min(0),
  activeDevices24h: z.number().min(0),
  platformStats: z.record(z.string(), z.number()),
  countryStats: z.record(z.string(), z.number()),
  cityStats: z.record(
    z.string(),
    z.object({
      count: z.number(),
      country: z.string(),
    })
  ),
  totalDevicesChange24h: z.number(),
  activeDevicesChange24h: z.number(),
});

export const DevicePlatformOverviewResponseSchema = z.object({
  totalDevices: z.number().min(0),
  activeDevices24h: z.number().min(0),
  platformStats: z.record(z.string(), z.number()),
  totalDevicesChange24h: z.number(),
  activeDevicesChange24h: z.number(),
});

export const DeviceLocationOverviewResponseSchema = z.object({
  totalDevices: z.number().min(0),
  countryStats: z.record(z.string(), z.number()),
  cityStats: z.record(
    z.string(),
    z.object({
      count: z.number(),
      country: z.string(),
    })
  ),
});

export const DeviceTimeseriesDataPointSchema = z.object({
  date: z.string(),
  activeUsers: z.number().min(0).optional(),
  totalUsers: z.number().min(0).optional(),
});

export const DeviceTimeseriesResponseSchema = z.object({
  data: z.array(DeviceTimeseriesDataPointSchema),
  period: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
});

export const DeviceLiveResponseSchema = z.object({
  activeNow: z.number().min(0),
});

export const DeviceActivityTimeseriesDataPointSchema = z.object({
  date: z.string(),
  sessionCount: z.number().min(0),
});

export const DeviceActivityTimeseriesResponseSchema = z.object({
  data: z.array(DeviceActivityTimeseriesDataPointSchema),
  period: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
  totalSessions: z.number().min(0),
  avgSessionDuration: z.number().nullable(),
  firstSeen: z.string().datetime(),
  lastActivityAt: z.string().datetime().nullable(),
});

export type Device = z.infer<typeof DeviceSchema>;
export type CreateDeviceRequest = z.infer<typeof CreateDeviceRequestSchema>;
export type DeviceListItem = z.infer<typeof DeviceListItemSchema>;
export type DeviceDetail = z.infer<typeof DeviceDetailSchema>;
export type DevicesListResponse = z.infer<typeof DevicesListResponseSchema>;
export type DeviceOverviewResponse = z.infer<
  typeof DeviceOverviewResponseSchema
>;
export type DevicePlatformOverviewResponse = z.infer<
  typeof DevicePlatformOverviewResponseSchema
>;
export type DeviceLocationOverviewResponse = z.infer<
  typeof DeviceLocationOverviewResponseSchema
>;
export type DeviceTimeseriesDataPoint = z.infer<
  typeof DeviceTimeseriesDataPointSchema
>;
export type DeviceTimeseriesResponse = z.infer<
  typeof DeviceTimeseriesResponseSchema
>;
export type DeviceLiveResponse = z.infer<typeof DeviceLiveResponseSchema>;
export type DeviceActivityTimeseriesDataPoint = z.infer<
  typeof DeviceActivityTimeseriesDataPointSchema
>;
export type DeviceActivityTimeseriesResponse = z.infer<
  typeof DeviceActivityTimeseriesResponseSchema
>;

export type ListDevicesQuery = {
  page?: string;
  pageSize?: string;
  startDate?: string;
  endDate?: string;
  platform?: Platform;
  properties?: string;
  appId: string;
};

export type GetDeviceQuery = {
  appId: string;
};

export type DeviceOverviewQuery = {
  appId: string;
};

export type DevicePlatformOverviewQuery = {
  appId: string;
};

export type DeviceLocationOverviewQuery = {
  appId: string;
  limit?: 'top3' | 'all';
};

export type DeviceLiveQuery = {
  appId: string;
};

export type DeviceTimeseriesQuery = {
  appId: string;
  startDate?: string;
  endDate?: string;
  metric?: 'dau' | 'total';
};

export type DeviceActivityTimeseriesQuery = {
  appId: string;
  startDate?: string;
  endDate?: string;
};

export type DeviceMetric = 'dau' | 'total';
