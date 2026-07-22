import type {
  DateFilterQueryParams,
  EventOverviewResponse,
  EventsListResponse,
  EventTimeseriesResponse,
  PaginationQueryParams,
  TopEventsResponse,
} from "@phase/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { buildQueryString, fetchApi } from "@/lib/api/client";
import { cacheConfig } from "@/lib/api/query-client";
import { queryKeys } from "@/lib/api/query-keys";

type EventFilters = PaginationQueryParams &
  DateFilterQueryParams & {
    eventName?: string;
    sessionId?: string;
    deviceId?: string;
  };

export function useEvents(appId: string, filters?: EventFilters) {
  return useQuery({
    queryKey: queryKeys.events.list(appId, filters),
    queryFn: () => {
      if (!appId) {
        return Promise.resolve({
          events: [],
          pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
        });
      }
      return fetchApi<EventsListResponse>(
        `/web/events${buildQueryString({ ...filters, appId })}`
      );
    },
    ...cacheConfig.list,
    enabled: Boolean(appId),
    placeholderData: keepPreviousData,
  });
}

export function useEventOverview(appId: string) {
  return useQuery({
    queryKey: queryKeys.events.overview(appId),
    queryFn: () =>
      fetchApi<EventOverviewResponse>(`/web/events/overview?appId=${appId}`),
    ...cacheConfig.overview,
    enabled: Boolean(appId),
  });
}

export function useTopEvents(appId: string, dateRange?: DateFilterQueryParams) {
  return useQuery({
    queryKey: queryKeys.events.top(appId, dateRange),
    queryFn: () =>
      fetchApi<TopEventsResponse>(
        `/web/events/top${buildQueryString({ appId, ...dateRange })}`
      ),
    ...cacheConfig.list,
    enabled: Boolean(appId),
  });
}

export function useEventTimeseries(
  appId: string,
  range: DateFilterQueryParams = {}
) {
  return useQuery({
    queryKey: queryKeys.events.timeseries(appId, range),
    queryFn: () =>
      fetchApi<EventTimeseriesResponse>(
        `/web/events/timeseries${buildQueryString({ appId, ...range })}`
      ),
    ...cacheConfig.timeseries,
    enabled: Boolean(appId),
  });
}
