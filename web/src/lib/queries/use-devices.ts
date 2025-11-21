import { useQuery } from '@tanstack/react-query';
import { buildQueryString, fetchApi } from '@/lib/api/client';
import type {
  DateRangeParams,
  DeviceDetail,
  DeviceLive,
  DeviceOverview,
  DevicesListResponse,
  DeviceTimeseriesResponse,
  PaginationParams,
} from '../api/types';
import { cacheConfig } from './query-client';
import { queryKeys } from './query-keys';

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

export function useDeviceTimeseries(appId: string, range?: DateRangeParams) {
  return useQuery({
    queryKey: queryKeys.devices.timeseries(appId, range),
    queryFn: () =>
      fetchApi<DeviceTimeseriesResponse>(
        `/web/devices/timeseries${buildQueryString({ appId, ...range })}`
      ),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: Boolean(appId),
  });
}
