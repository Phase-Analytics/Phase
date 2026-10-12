import {
  keepPreviousData,
  queryOptions,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { toDateRangeParams } from '@/lib/analytics-time-range';
import { buildQueryString, fetchApi } from '@/lib/api/client';
import type {
  DateRangeParams,
  PaginationQueryParams,
  SessionMetric,
  SessionOverviewResponse,
  SessionsListResponse,
  SessionTimeseriesResponse,
  TimeRange,
} from '@/lib/api/types';
import { useTimezoneStore } from '@/stores/timezone-store';
import { cacheConfig } from './query-client';
import { queryKeys } from './query-keys';

type SessionFilters = PaginationQueryParams & {
  startDate?: string;
  endDate?: string;
};

export function useSessions(
  appId: string,
  filters?: SessionFilters & { deviceId?: string }
) {
  return useQuery({
    queryKey: queryKeys.sessions.list(appId, filters?.deviceId || '', filters),
    queryFn: () => {
      if (!appId) {
        return Promise.resolve({
          sessions: [],
          pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
        });
      }
      return fetchApi<SessionsListResponse>(
        `/web/sessions${buildQueryString({ ...filters, appId })}`
      );
    },
    ...cacheConfig.list,
    enabled: Boolean(appId),
    placeholderData: keepPreviousData,
  });
}

export function sessionOverviewQuery(appId: string, tz: string) {
  return queryOptions({
    queryKey: queryKeys.sessions.overview(appId, tz),
    queryFn: (): Promise<SessionOverviewResponse> => {
      if (!appId) {
        return Promise.resolve({
          totalSessions: 0,
          totalSessionsChange24h: 0,
          activeSessions24h: 0,
          activeSessions24hChange: 0,
          averageSessionDuration: 0,
          bounceRate: 0,
        });
      }
      return fetchApi<SessionOverviewResponse>(
        `/web/sessions/overview${buildQueryString({ appId, tz })}`
      );
    },
    ...cacheConfig.overview,
  });
}

export function sessionTimeseriesQuery(
  appId: string,
  range: TimeRange | DateRangeParams | undefined,
  metric: SessionMetric | undefined,
  tz: string
) {
  return queryOptions({
    queryKey: queryKeys.sessions.timeseries(appId, {
      range,
      ...(metric && { metric }),
      tz,
    }),
    queryFn: (): Promise<SessionTimeseriesResponse> => {
      if (!appId) {
        const now = new Date().toISOString();
        return Promise.resolve({
          data: [],
          period: { startDate: now, endDate: now },
        });
      }
      return fetchApi<SessionTimeseriesResponse>(
        `/web/sessions/timeseries${buildQueryString({
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

export function useSessionOverviewResponse(appId: string) {
  const tz = useTimezoneStore((s) => s.timezone);
  return useSuspenseQuery(sessionOverviewQuery(appId, tz));
}

export function useSessionTimeseries(
  appId: string,
  range?: TimeRange | DateRangeParams,
  metric?: SessionMetric
) {
  const tz = useTimezoneStore((s) => s.timezone);
  return useSuspenseQuery(sessionTimeseriesQuery(appId, range, metric, tz));
}
