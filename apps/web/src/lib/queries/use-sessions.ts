import { useSuspenseQuery } from '@tanstack/react-query';
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

type SessionFilters = PaginationQueryParams & {
  startDate?: string;
  endDate?: string;
};

export function useSessions(
  appId: string,
  filters?: SessionFilters & { deviceId?: string }
) {
  return useSuspenseQuery({
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
  });
}

export function useSessionOverviewResponse(appId: string) {
  return useSuspenseQuery({
    queryKey: queryKeys.sessions.overview(appId),
    queryFn: () => {
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
        `/web/sessions/overview?appId=${appId}`
      );
    },
    ...cacheConfig.overview,
  });
}

export function useSessionTimeseries(
  appId: string,
  range?: TimeRange | DateRangeParams,
  metric?: SessionMetric
) {
  const queryKeyParams = {
    range,
    ...(metric && { metric }),
  };

  return useSuspenseQuery({
    queryKey: queryKeys.sessions.timeseries(appId, queryKeyParams),
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

      return fetchApi<SessionTimeseriesResponse>(
        `/web/sessions/timeseries${buildQueryString({ appId, ...queryParams })}`
      );
    },
    ...cacheConfig.timeseries,
  });
}
