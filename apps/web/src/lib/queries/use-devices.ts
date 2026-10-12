import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { toDateRangeParams } from '@/lib/analytics-time-range';
import { buildQueryString, fetchApi } from '@/lib/api/client';
import { useTimezoneStore } from '@/stores/timezone-store';
import type {
  DateRangeParams,
  DeviceActivityTimeseriesResponse,
  DeviceDetail,
  DeviceLiveResponse,
  DeviceMetric,
  DeviceOverviewResponse,
  DeviceRetentionResponse,
  DevicesListResponse,
  DeviceTimeseriesResponse,
  PaginationQueryParams,
  TimeRange,
} from '../api/types';
import { cacheConfig, getQueryClient } from './query-client';
import { queryKeys } from './query-keys';

type DeviceFilters = PaginationQueryParams & {
  platform?: string;
  startDate?: string;
  endDate?: string;
  properties?: string;
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

export function deviceOverviewQuery(appId: string, tz: string) {
  return queryOptions({
    queryKey: queryKeys.devices.overview(appId, tz),
    queryFn: (): Promise<DeviceOverviewResponse> => {
      if (!appId) {
        return Promise.resolve({
          totalDevices: 0,
          totalDevicesChange24h: 0,
          activeDevices24h: 0,
          activeDevicesChange24h: 0,
          platformStats: {},
          countryStats: {},
          appVersionStats: { ios: {}, android: {} },
        });
      }
      return fetchApi<DeviceOverviewResponse>(
        `/web/devices/overview${buildQueryString({ appId, tz })}`
      );
    },
    ...cacheConfig.overview,
  });
}

export function deviceLiveQuery(appId: string) {
  return queryOptions({
    queryKey: queryKeys.devices.live(appId),
    queryFn: (): Promise<DeviceLiveResponse> => {
      if (!appId) {
        return Promise.resolve({ activeNow: 0 });
      }
      return fetchApi<DeviceLiveResponse>(`/web/devices/live?appId=${appId}`);
    },
    ...cacheConfig.realtime,
  });
}

export function deviceRetentionQuery(
  appId: string,
  range: TimeRange | DateRangeParams | undefined,
  tz: string
) {
  return queryOptions({
    queryKey: queryKeys.devices.retention(appId, { range, tz }),
    queryFn: (): Promise<DeviceRetentionResponse> => {
      if (!appId) {
        const now = new Date().toISOString();
        return Promise.resolve({
          summary: { d1: 0, d3: 0, d7: 0, d14: 0, d30: 0 },
          data: [],
          period: { startDate: now, endDate: now },
        });
      }
      return fetchApi<DeviceRetentionResponse>(
        `/web/devices/retention${buildQueryString({
          appId,
          ...toDateRangeParams(range),
          tz,
        })}`
      );
    },
    ...cacheConfig.timeseries,
  });
}

export function deviceTimeseriesQuery(
  appId: string,
  range: TimeRange | DateRangeParams | undefined,
  metric: DeviceMetric | undefined,
  tz: string
) {
  return queryOptions({
    queryKey: queryKeys.devices.timeseries(appId, {
      range,
      ...(metric && { metric }),
      tz,
    }),
    queryFn: (): Promise<DeviceTimeseriesResponse> => {
      if (!appId) {
        const now = new Date().toISOString();
        return Promise.resolve({
          data: [],
          period: { startDate: now, endDate: now },
        });
      }
      return fetchApi<DeviceTimeseriesResponse>(
        `/web/devices/timeseries${buildQueryString({
          appId,
          ...toDateRangeParams(range),
          ...(metric && { metric }),
          tz,
        })}`
      );
    },
    ...cacheConfig.timeseries,
  });
}

export function useDeviceOverviewResponse(appId: string) {
  const tz = useTimezoneStore((s) => s.timezone);
  return useSuspenseQuery(deviceOverviewQuery(appId, tz));
}

export function useDeviceLiveResponse(appId: string) {
  return useSuspenseQuery(deviceLiveQuery(appId));
}

export function useDeviceRetention(
  appId: string,
  range?: TimeRange | DateRangeParams
) {
  const tz = useTimezoneStore((s) => s.timezone);
  return useSuspenseQuery(deviceRetentionQuery(appId, range, tz));
}

export function useDeviceTimeseries(
  appId: string,
  range?: TimeRange | DateRangeParams,
  metric?: DeviceMetric
) {
  const tz = useTimezoneStore((s) => s.timezone);
  return useSuspenseQuery(deviceTimeseriesQuery(appId, range, metric, tz));
}

export function useDeviceActivityTimeseries(
  deviceId: string,
  appId: string,
  range?: TimeRange | DateRangeParams
) {
  const tz = useTimezoneStore((s) => s.timezone);
  const dateParams = toDateRangeParams(range);

  return useSuspenseQuery<DeviceActivityTimeseriesResponse>({
    queryKey: queryKeys.devices.activityTimeseries(
      deviceId,
      appId,
      dateParams,
      tz
    ),
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

      return fetchApi<DeviceActivityTimeseriesResponse>(
        `/web/devices/${deviceId}/activity${buildQueryString({
          appId,
          ...dateParams,
          tz,
        })}`
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
        queryKey: queryKeys.devices.overviews(variables.appId),
      });
      toast.success('User banned successfully');
    },
  });
}
