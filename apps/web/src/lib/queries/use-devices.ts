import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { buildQueryString, fetchApi } from '@/lib/api/client';
import type {
  DateRangeParams,
  DeviceActivityTimeseriesResponse,
  DeviceDetail,
  DeviceLiveResponse,
  DeviceMetric,
  DeviceOverviewResponse,
  DevicesListResponse,
  DeviceTimeseriesResponse,
  PaginationQueryParams,
  TimeRange,
} from '../api/types';
import { cacheConfig, getQueryClient } from './query-client';
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

type DeviceFilters = PaginationQueryParams & {
  platform?: string;
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

export function useDeviceOverviewResponse(appId: string) {
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
          cityStats: {},
        });
      }
      return fetchApi<DeviceOverviewResponse>(
        `/web/devices/overview?appId=${appId}`
      );
    },
    ...cacheConfig.overview,
  });
}

export function useDeviceLiveResponse(appId: string) {
  return useSuspenseQuery({
    queryKey: queryKeys.devices.live(appId),
    queryFn: () => {
      if (!appId) {
        return Promise.resolve({
          activeNow: 0,
        });
      }
      return fetchApi<DeviceLiveResponse>(`/web/devices/live?appId=${appId}`);
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
  const dateParams =
    range && typeof range === 'string'
      ? getTimeRangeDates(range)
      : (range as DateRangeParams | undefined);

  return useSuspenseQuery<DeviceActivityTimeseriesResponse>({
    queryKey: queryKeys.devices.activityTimeseries(deviceId, appId, dateParams),
    queryFn: () => {
      if (!(deviceId && appId)) {
        return Promise.resolve({
          data: [],
          period: {
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
          },
          totalSessions: 0,
          avgSessionDuration: null,
          firstSeen: new Date().toISOString(),
          lastActivityAt: null,
        });
      }

      const queryParams = dateParams ? { appId, ...dateParams } : { appId };

      return fetchApi<DeviceActivityTimeseriesResponse>(
        `/web/devices/${deviceId}/activity${buildQueryString(queryParams)}`
      );
    },
    ...cacheConfig.timeseries,
  });
}

export function useDeleteDevice() {
  return useMutation({
    mutationFn: ({ deviceId, appId }: { deviceId: string; appId: string }) =>
      fetchApi<void>(`/web/devices/${deviceId}?appId=${appId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, variables) => {
      const queryClient = getQueryClient();
      queryClient.invalidateQueries({
        queryKey: queryKeys.devices.list(variables.appId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.devices.detail(variables.deviceId, variables.appId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.devices.overview(variables.appId),
      });
      toast.success('User banned successfully');
    },
  });
}
