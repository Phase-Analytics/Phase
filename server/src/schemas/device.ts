import { t } from 'elysia';

export const PlatformSchema = t.Union([
  t.Literal('ios'),
  t.Literal('android'),
  t.Literal('web'),
  t.Literal('unknown'),
]);

export const DeviceSchema = t.Object({
  deviceId: t.String(),
  model: t.Union([t.String(), t.Null()]),
  osVersion: t.Union([t.String(), t.Null()]),
  platform: t.Union([PlatformSchema, t.Null()]),
  appVersion: t.Union([t.String(), t.Null()]),
  country: t.Union([t.String(), t.Null()]),
  city: t.Union([t.String(), t.Null()]),
  firstSeen: t.String({ format: 'date-time' }),
});

export const CreateDeviceRequestSchema = t.Object({
  deviceId: t.String(),
  model: t.Optional(t.Union([t.String(), t.Null()])),
  osVersion: t.Optional(t.Union([t.String(), t.Null()])),
  platform: t.Optional(t.Union([PlatformSchema, t.Null()])),
  appVersion: t.Optional(t.Union([t.String(), t.Null()])),
});

export const DeviceListItemSchema = t.Object({
  deviceId: t.String(),
  platform: t.Union([PlatformSchema, t.Null()]),
  country: t.Union([t.String(), t.Null()]),
  city: t.Union([t.String(), t.Null()]),
  firstSeen: t.String({ format: 'date-time' }),
});

export const DeviceDetailSchema = t.Object({
  deviceId: t.String(),
  model: t.Union([t.String(), t.Null()]),
  osVersion: t.Union([t.String(), t.Null()]),
  platform: t.Union([PlatformSchema, t.Null()]),
  appVersion: t.Union([t.String(), t.Null()]),
  country: t.Union([t.String(), t.Null()]),
  city: t.Union([t.String(), t.Null()]),
  firstSeen: t.String({ format: 'date-time' }),
  lastActivityAt: t.Union([t.String({ format: 'date-time' }), t.Null()]),
});

export const DevicesListResponseSchema = t.Object({
  devices: t.Array(DeviceListItemSchema),
  pagination: t.Object({
    total: t.Number({ minimum: 0 }),
    page: t.Number({ minimum: 1 }),
    pageSize: t.Number({ minimum: 1 }),
    totalPages: t.Number({ minimum: 0 }),
  }),
});

export const DeviceOverviewResponseSchema = t.Object({
  totalDevices: t.Number({ minimum: 0 }),
  activeDevices24h: t.Number({ minimum: 0 }),
  platformStats: t.Record(t.String(), t.Number()),
  countryStats: t.Record(t.String(), t.Number()),
  totalDevicesChange24h: t.Number(),
  activeDevicesChange24h: t.Number(),
});

export const DevicePlatformOverviewResponseSchema = t.Object({
  totalDevices: t.Number({ minimum: 0 }),
  activeDevices24h: t.Number({ minimum: 0 }),
  platformStats: t.Record(t.String(), t.Number()),
  totalDevicesChange24h: t.Number(),
  activeDevicesChange24h: t.Number(),
});

export const DeviceLocationOverviewResponseSchema = t.Object({
  totalDevices: t.Number({ minimum: 0 }),
  countryStats: t.Record(t.String(), t.Number()),
  cityStats: t.Record(
    t.String(),
    t.Object({
      count: t.Number(),
      country: t.String(),
    })
  ),
});

export const DeviceTimeseriesDataPointSchema = t.Object({
  date: t.String(),
  activeUsers: t.Optional(t.Number({ minimum: 0 })),
  totalUsers: t.Optional(t.Number({ minimum: 0 })),
});

export const DeviceTimeseriesResponseSchema = t.Object({
  data: t.Array(DeviceTimeseriesDataPointSchema),
  period: t.Object({
    startDate: t.String({ format: 'date-time' }),
    endDate: t.String({ format: 'date-time' }),
  }),
});

export const DeviceLiveResponseSchema = t.Object({
  activeNow: t.Number({ minimum: 0 }),
});

export const DeviceActivityTimeseriesDataPointSchema = t.Object({
  date: t.String(),
  sessionCount: t.Number({ minimum: 0 }),
});

export const DeviceActivityTimeseriesResponseSchema = t.Object({
  data: t.Array(DeviceActivityTimeseriesDataPointSchema),
  period: t.Object({
    startDate: t.String({ format: 'date-time' }),
    endDate: t.String({ format: 'date-time' }),
  }),
  totalSessions: t.Number({ minimum: 0 }),
  avgSessionDuration: t.Union([t.Number(), t.Null()]),
  firstSeen: t.String({ format: 'date-time' }),
  lastActivityAt: t.Union([t.String({ format: 'date-time' }), t.Null()]),
});

export type Platform = 'ios' | 'android' | 'web' | 'unknown';
export type Device = typeof DeviceSchema.static;
export type CreateDeviceRequest = typeof CreateDeviceRequestSchema.static;
export type DeviceListItem = typeof DeviceListItemSchema.static;
export type DeviceDetail = typeof DeviceDetailSchema.static;
export type DevicesListResponse = typeof DevicesListResponseSchema.static;
export type DeviceOverviewResponse = typeof DeviceOverviewResponseSchema.static;
export type DevicePlatformOverviewResponse =
  typeof DevicePlatformOverviewResponseSchema.static;
export type DeviceLocationOverviewResponse =
  typeof DeviceLocationOverviewResponseSchema.static;
export type DeviceTimeseriesDataPoint =
  typeof DeviceTimeseriesDataPointSchema.static;
export type DeviceTimeseriesResponse =
  typeof DeviceTimeseriesResponseSchema.static;
export type DeviceLiveResponse = typeof DeviceLiveResponseSchema.static;
export type DeviceActivityTimeseriesDataPoint =
  typeof DeviceActivityTimeseriesDataPointSchema.static;
export type DeviceActivityTimeseriesResponse =
  typeof DeviceActivityTimeseriesResponseSchema.static;

export type ListDevicesQuery = {
  page?: string;
  pageSize?: string;
  startDate?: string;
  endDate?: string;
  platform?: Platform;
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
