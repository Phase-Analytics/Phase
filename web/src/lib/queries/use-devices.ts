import { useQuery } from '@tanstack/react-query';
import { buildQueryString, fetchApi } from '@/lib/api/client';
import type {
  DateRangeParams,
  DeviceDetail,
  DeviceLive,
  DeviceMetric,
  DeviceOverview,
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
  return useQuery({
    queryKey: queryKeys.devices.list(appId, filters),
    queryFn: () =>
      fetchApi<DevicesListResponse>(
        `/web/devices${buildQueryString({ ...filters, appId })}`
      ),
    ...cacheConfig.list,
    enabled: Boolean(appId),
  });
}

export function useDevice(deviceId: string, appId: string) {
  return useQuery({
    queryKey: queryKeys.devices.detail(deviceId, appId),
    queryFn: () =>
      fetchApi<DeviceDetail>(`/web/devices/${deviceId}?appId=${appId}`),
    ...cacheConfig.detail,
    enabled: Boolean(deviceId && appId),
  });
}

export function useDeviceOverview(appId: string) {
  return useQuery({
    queryKey: queryKeys.devices.overview(appId),
    queryFn: () =>
      fetchApi<DeviceOverview>(`/web/devices/overview?appId=${appId}`),
    ...cacheConfig.overview,
    enabled: Boolean(appId),
  });
}

export function useDeviceLive(appId: string) {
  return useQuery({
    queryKey: queryKeys.devices.live(appId),
    queryFn: () => fetchApi<DeviceLive>(`/web/devices/live?appId=${appId}`),
    ...cacheConfig.realtime,
    enabled: Boolean(appId),
  });
}

export function useDeviceTimeseries(
  appId: string,
  range?: TimeRange | DateRangeParams,
  metric?: DeviceMetric,
  enabled = true
) {
  const queryKeyParams = {
    range,
    ...(metric && { metric }),
  };

  return useQuery({
    queryKey: queryKeys.devices.timeseries(appId, queryKeyParams),
    queryFn: () => {
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
    enabled: Boolean(appId) && enabled,
  });
}
