import { useQuery } from '@tanstack/react-query';
import { buildQueryString, fetchApi } from '@/lib/api/client';
import type {
  DateRangeParams,
  EventDetail,
  EventOverview,
  EventsListResponse,
  EventTimeseriesResponse,
  PaginationParams,
  TimeRange,
  TopEventsResponse,
} from '@/lib/api/types';
import { cacheConfig } from './query-client';
import { queryKeys } from './query-keys';

type EventFilters = PaginationParams & {
  eventName?: string;
  sessionId?: string;
  deviceId?: string;
  startDate?: string;
  endDate?: string;
};

export function useEvents(appId: string, filters?: EventFilters) {
  return useQuery({
    queryKey: queryKeys.events.list(appId, filters),
    queryFn: () =>
      fetchApi<EventsListResponse>(
        `/web/events${buildQueryString({ ...filters, appId })}`
      ),
    ...cacheConfig.list,
    enabled: Boolean(appId),
  });
}

export function useEvent(eventId: string, appId: string) {
  return useQuery({
    queryKey: queryKeys.events.detail(eventId, appId),
    queryFn: () =>
      fetchApi<EventDetail>(`/web/events/${eventId}?appId=${appId}`),
    ...cacheConfig.detail,
    enabled: Boolean(eventId && appId),
  });
}

export function useEventOverview(appId: string) {
  return useQuery({
    queryKey: queryKeys.events.overview(appId),
    queryFn: () =>
      fetchApi<EventOverview>(`/web/events/overview?appId=${appId}`),
    ...cacheConfig.overview,
    enabled: Boolean(appId),
  });
}

export function useTopEvents(appId: string, dateRange?: DateRangeParams) {
  return useQuery({
    queryKey: queryKeys.events.top(appId, dateRange),
    queryFn: () =>
      fetchApi<TopEventsResponse>(
        `/web/events/top${buildQueryString({ ...dateRange, appId })}`
      ),
    ...cacheConfig.overview,
    enabled: Boolean(appId),
  });
}

export function useEventTimeseries(
  appId: string,
  timeRange: TimeRange,
  enabled = true
) {
  const getDateRange = (range: TimeRange): DateRangeParams => {
    const now = new Date();
    const endDate = now.toISOString();
    let startDate: Date;

    switch (range) {
      case '7d': {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      }
      case '30d': {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        break;
      }
      case '180d': {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 180);
        break;
      }
      case '360d': {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 360);
        break;
      }
      default: {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
      }
    }

    return {
      startDate: startDate.toISOString(),
      endDate,
    };
  };

  const dateRange = getDateRange(timeRange);

  return useQuery({
    queryKey: queryKeys.events.timeseries(appId, timeRange),
    queryFn: () =>
      fetchApi<EventTimeseriesResponse>(
        `/web/events/timeseries${buildQueryString({ ...dateRange, appId })}`
      ),
    ...cacheConfig.overview,
    enabled: Boolean(appId) && enabled,
  });
}
