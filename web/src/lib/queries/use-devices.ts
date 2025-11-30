import { useSuspenseQuery } from '@tanstack/react-query';
import { buildQueryString, fetchApi } from '@/lib/api/client';
import type {
  DateRangeParams,
  DeviceActivityTimeseriesResponse,
  DeviceDetail,
  DeviceLive,
  DeviceLocationOverview,
  DeviceMetric,
  DeviceOverview,
  DevicePlatformOverview,
  DeviceSessionsWithEventsResponse,
  DevicesListResponse,
  DeviceTimeseriesResponse,
  PaginationParams,
  TimeRange,
} from '../api/types';
import { cacheConfig } from './query-client';
import { queryKeys } from './query-keys';

function getTimeRangeDates(range: TimeRange): DateRangeParams {
  const now = new Date();
  const days = Number.parseInt(range, 10);
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return {
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
  };
}

type DeviceFilters = PaginationParams & {
  platform?: string;
  identifier?: string;
  startDate?: string;
  endDate?: string;
};

export function useDevices(appId: string, filters?: DeviceFilters) {
  return useSuspenseQuery({
    queryKey: queryKeys.devices.list(appId, filters),
    queryFn: () => {
      if (!appId) {
        return Promise.resolve({
          devices: [],
          pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
        });
      }
      return fetchApi<DevicesListResponse>(
        `/web/devices${buildQueryString({ ...filters, appId })}`
      );
    },
    ...cacheConfig.list,
  });
}

export function useDevice(deviceId: string, appId: string) {
  return useSuspenseQuery({
    queryKey: queryKeys.devices.detail(deviceId, appId),
    queryFn: () => {
      if (!(deviceId && appId)) {
        throw new Error('Device ID and App ID are required');
      }
      return fetchApi<DeviceDetail>(`/web/devices/${deviceId}?appId=${appId}`);
    },
    ...cacheConfig.detail,
  });
}

export function useDeviceOverview(appId: string) {
  return useSuspenseQuery({
    queryKey: queryKeys.devices.overview(appId),
    queryFn: () => {
      if (!appId) {
        return Promise.resolve({
          totalDevices: 0,
          totalDevicesChange24h: 0,
          activeDevices24h: 0,
          activeDevicesChange24h: 0,
          platformStats: {},
          countryStats: {},
        });
      }
      return fetchApi<DeviceOverview>(`/web/devices/overview?appId=${appId}`);
    },
    ...cacheConfig.overview,
  });
}

export function useDevicePlatformOverview(appId: string) {
  return useSuspenseQuery({
    queryKey: queryKeys.devices.platformOverview(appId),
    queryFn: () => {
      if (!appId) {
        return Promise.resolve({
          totalDevices: 0,
          totalDevicesChange24h: 0,
          activeDevices24h: 0,
          activeDevicesChange24h: 0,
          platformStats: {},
        });
      }
      return fetchApi<DevicePlatformOverview>(
        `/web/devices/overview/platform${buildQueryString({ appId })}`
      );
    },
    ...cacheConfig.overview,
  });
}

export function useDeviceLocationOverview(appId: string) {
  return useSuspenseQuery({
    queryKey: queryKeys.devices.locationOverview(appId),
    queryFn: () => {
      if (!appId) {
        return Promise.resolve({
          totalDevices: 0,
          countryStats: {},
          cityStats: {},
        });
      }
      return fetchApi<DeviceLocationOverview>(
        `/web/devices/overview/location${buildQueryString({ appId, limit: 'all' })}`
      );
    },
    ...cacheConfig.overview,
  });
}

export function useDeviceLive(appId: string) {
  return useSuspenseQuery({
    queryKey: queryKeys.devices.live(appId),
    queryFn: () => {
      if (!appId) {
        return Promise.resolve({
          activeNow: 0,
        });
      }
      return fetchApi<DeviceLive>(`/web/devices/live?appId=${appId}`);
    },
    ...cacheConfig.realtime,
  });
}

export function useDeviceTimeseries(
  appId: string,
  range?: TimeRange | DateRangeParams,
  metric?: DeviceMetric
) {
  const queryKeyParams = {
    range,
    ...(metric && { metric }),
  };

  return useSuspenseQuery({
    queryKey: queryKeys.devices.timeseries(appId, queryKeyParams),
    queryFn: () => {
      if (!appId) {
        return Promise.resolve({
          data: [],
          period: {
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
          },
        });
      }

      const dateParams =
        range && typeof range === 'string'
          ? getTimeRangeDates(range)
          : (range as DateRangeParams | undefined);

      const queryParams = {
        ...dateParams,
        ...(metric && { metric }),
      };

      return fetchApi<DeviceTimeseriesResponse>(
        `/web/devices/timeseries${buildQueryString({ appId, ...queryParams })}`
      );
    },
    ...cacheConfig.timeseries,
  });
}

export function useDeviceActivityTimeseries(
  deviceId: string,
  appId: string,
  range?: TimeRange | DateRangeParams
) {
  return useSuspenseQuery({
    queryKey: queryKeys.devices.activityTimeseries(
      deviceId,
      appId,
      range && typeof range === 'string' ? getTimeRangeDates(range) : range
    ),
    queryFn: () => {
      if (!(deviceId && appId)) {
        throw new Error('Device ID and App ID are required');
      }

      const dateParams =
        range && typeof range === 'string'
          ? getTimeRangeDates(range)
          : (range as DateRangeParams | undefined);

      return fetchApi<DeviceActivityTimeseriesResponse>(
        `/web/devices/${deviceId}/activity${buildQueryString({ appId, ...dateParams })}`
      );
    },
    ...cacheConfig.timeseries,
  });
}

export function useDeviceSessionsWithEvents(
  deviceId: string,
  appId: string,
  filters?: PaginationParams
) {
  return useSuspenseQuery({
    queryKey: queryKeys.devices.sessionsWithEvents(deviceId, appId, filters),
    queryFn: () => {
      if (!(deviceId && appId)) {
        throw new Error('Device ID and App ID are required');
      }

      return fetchApi<DeviceSessionsWithEventsResponse>(
        `/web/devices/${deviceId}/sessions-with-events${buildQueryString({ appId, ...filters })}`
      );
    },
    ...cacheConfig.list,
  });
}
