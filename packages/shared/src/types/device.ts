import type { PaginationMeta } from './common';

export type Platform = 'ios' | 'android' | 'unknown';
export type DeviceType = 'phone' | 'tablet' | 'desktop' | 'unknown';

export type Device = {
  deviceId: string;
  deviceType: DeviceType | null;
  osVersion: string | null;
  platform: Platform | null;
  appVersion: string | null;
  locale: string | null;
  country: string | null;
  city: string | null;
  firstSeen: string;
};

export type CreateDeviceRequest = {
  deviceId: string;
  deviceType?: DeviceType | null;
  osVersion?: string | null;
  platform?: Platform | null;
  appVersion?: string | null;
  locale?: string | null;
};

export type DeviceListItem = {
  deviceId: string;
  platform: Platform | null;
  country: string | null;
  city: string | null;
  firstSeen: string;
};

export type DeviceDetail = {
  deviceId: string;
  deviceType: DeviceType | null;
  osVersion: string | null;
  platform: Platform | null;
  appVersion: string | null;
  locale: string | null;
  country: string | null;
  city: string | null;
  firstSeen: string;
  lastActivityAt: string | null;
};

export type DevicesListResponse = {
  devices: DeviceListItem[];
  pagination: PaginationMeta;
};

export type DeviceOverviewResponse = {
  totalDevices: number;
  activeDevices24h: number;
  platformStats: Record<string, number>;
  countryStats: Record<string, number>;
  totalDevicesChange24h: number;
  activeDevicesChange24h: number;
};

export type DevicePlatformOverviewResponse = {
  totalDevices: number;
  activeDevices24h: number;
  platformStats: Record<string, number>;
  totalDevicesChange24h: number;
  activeDevicesChange24h: number;
};

export type DeviceLocationOverviewResponse = {
  totalDevices: number;
  countryStats: Record<string, number>;
  cityStats: Record<
    string,
    {
      count: number;
      country: string;
    }
  >;
};

export type DeviceTimeseriesDataPoint = {
  date: string;
  activeUsers?: number;
  totalUsers?: number;
};

export type DeviceTimeseriesResponse = {
  data: DeviceTimeseriesDataPoint[];
  period: {
    startDate: string;
    endDate: string;
  };
};

export type DeviceLiveResponse = {
  activeNow: number;
};

export type DeviceActivityTimeseriesDataPoint = {
  date: string;
  sessionCount: number;
};

export type DeviceActivityTimeseriesResponse = {
  data: DeviceActivityTimeseriesDataPoint[];
  period: {
    startDate: string;
    endDate: string;
  };
  totalSessions: number;
  avgSessionDuration: number | null;
  firstSeen: string;
  lastActivityAt: string | null;
};

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
