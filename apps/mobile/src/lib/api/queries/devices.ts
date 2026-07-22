import type {
  DateFilterQueryParams,
  DeviceDetail,
  DeviceOverviewResponse,
  DevicesListResponse,
  DeviceTimeseriesResponse,
  PaginationQueryParams,
} from "@phase/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { buildQueryString, fetchApi } from "@/lib/api/client";
import { cacheConfig } from "@/lib/api/query-client";
import { queryKeys } from "@/lib/api/query-keys";

type DeviceFilters = PaginationQueryParams &
  DateFilterQueryParams & {
    platform?: string;
  };

export function useDevices(appId: string, filters?: DeviceFilters) {
  return useQuery({
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
    enabled: Boolean(appId),
    placeholderData: keepPreviousData,
  });
}

export function useDevice(deviceId: string, appId: string) {
  return useQuery({
    queryKey: queryKeys.devices.detail(deviceId, appId),
    queryFn: () =>
      fetchApi<DeviceDetail>(`/web/devices/${deviceId}?appId=${appId}`),
    ...cacheConfig.detail,
    enabled: Boolean(deviceId) && Boolean(appId),
  });
}

export function useDeviceOverview(appId: string) {
  return useQuery({
    queryKey: queryKeys.devices.overview(appId),
    queryFn: () =>
      fetchApi<DeviceOverviewResponse>(`/web/devices/overview?appId=${appId}`),
    ...cacheConfig.overview,
    enabled: Boolean(appId),
  });
}

export function useDeviceTimeseries(
  appId: string,
  range: DateFilterQueryParams = {}
) {
  return useQuery({
    queryKey: queryKeys.devices.timeseries(appId, range),
    queryFn: () =>
      fetchApi<DeviceTimeseriesResponse>(
        `/web/devices/timeseries${buildQueryString({ appId, ...range })}`
      ),
    ...cacheConfig.timeseries,
    enabled: Boolean(appId),
  });
}
