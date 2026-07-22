import type {
  DateFilterQueryParams,
  PaginationQueryParams,
  SessionOverviewResponse,
  SessionsListResponse,
  SessionTimeseriesResponse,
} from "@phase/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { buildQueryString, fetchApi } from "@/lib/api/client";
import { cacheConfig } from "@/lib/api/query-client";
import { queryKeys } from "@/lib/api/query-keys";

type SessionFilters = PaginationQueryParams &
  DateFilterQueryParams & {
    deviceId?: string;
  };

export function useSessions(appId: string, filters?: SessionFilters) {
  return useQuery({
    queryKey: queryKeys.sessions.list(appId, filters),
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

export function useSessionOverview(appId: string) {
  return useQuery({
    queryKey: queryKeys.sessions.overview(appId),
    queryFn: () =>
      fetchApi<SessionOverviewResponse>(
        `/web/sessions/overview?appId=${appId}`
      ),
    ...cacheConfig.overview,
    enabled: Boolean(appId),
  });
}

export function useSessionTimeseries(
  appId: string,
  range: DateFilterQueryParams = {}
) {
  return useQuery({
    queryKey: queryKeys.sessions.timeseries(appId, range),
    queryFn: () =>
      fetchApi<SessionTimeseriesResponse>(
        `/web/sessions/timeseries${buildQueryString({ appId, ...range })}`
      ),
    ...cacheConfig.timeseries,
    enabled: Boolean(appId),
  });
}
