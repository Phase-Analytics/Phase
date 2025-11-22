import { useQuery } from '@tanstack/react-query';
import { buildQueryString, fetchApi } from '@/lib/api/client';
import type {
  DateRangeParams,
  PaginationParams,
  SessionMetric,
  SessionOverview,
  SessionsListResponse,
  SessionTimeseriesResponse,
  TimeRange,
} from '@/lib/api/types';
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

type SessionFilters = PaginationParams & {
  startDate?: string;
  endDate?: string;
};

export function useSessions(
  appId: string,
  filters?: SessionFilters & { deviceId?: string }
) {
  return useQuery({
    queryKey: queryKeys.sessions.list(appId, filters?.deviceId || '', filters),
    queryFn: () =>
      fetchApi<SessionsListResponse>(
        `/web/sessions${buildQueryString({ ...filters, appId })}`
      ),
    ...cacheConfig.list,
    enabled: Boolean(appId),
  });
}

export function useSessionOverview(appId: string) {
  return useQuery({
    queryKey: queryKeys.sessions.overview(appId),
    queryFn: () =>
      fetchApi<SessionOverview>(`/web/sessions/overview?appId=${appId}`),
    ...cacheConfig.overview,
    enabled: Boolean(appId),
  });
}

export function useSessionTimeseries(
  appId: string,
  range?: TimeRange | DateRangeParams,
  metric?: SessionMetric,
  enabled = true
) {
  const dateParams =
    range && typeof range === 'string'
      ? getTimeRangeDates(range)
      : (range as DateRangeParams | undefined);

  const queryParams = {
    ...dateParams,
    ...(metric && { metric }),
  };

  return useQuery({
    queryKey: queryKeys.sessions.timeseries(appId, queryParams),
    queryFn: () =>
      fetchApi<SessionTimeseriesResponse>(
        `/web/sessions/timeseries${buildQueryString({ appId, ...queryParams })}`
      ),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: Boolean(appId) && enabled,
  });
}
