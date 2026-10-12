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
  Event,
  EventOverviewResponse,
  EventsListResponse,
  EventTimeseriesResponse,
  PaginationQueryParams,
  TimeRange,
  TopEventsResponse,
} from '@/lib/api/types';
import { useTimezoneStore } from '@/stores/timezone-store';
import { cacheConfig } from './query-client';
import { queryKeys } from './query-keys';

type EventFilters = PaginationQueryParams & {
  eventName?: string;
  sessionId?: string;
  deviceId?: string;
  startDate?: string;
  endDate?: string;
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

export function useEvent(eventId: string, appId: string) {
  return useSuspenseQuery({
    queryKey: queryKeys.events.detail(eventId, appId),
    queryFn: () => {
      if (!(eventId && appId)) {
        throw new Error('Event ID and App ID are required');
      }
      return fetchApi<Event>(`/web/events/${eventId}?appId=${appId}`);
    },
    ...cacheConfig.detail,
  });
}

export function eventOverviewQuery(appId: string, tz: string) {
  return queryOptions({
    queryKey: queryKeys.events.overview(appId, tz),
    queryFn: (): Promise<EventOverviewResponse> => {
      if (!appId) {
        return Promise.resolve({
          totalEvents: 0,
          totalEventsChange24h: 0,
          events24h: 0,
          events24hChange: 0,
        });
      }
      return fetchApi<EventOverviewResponse>(
        `/web/events/overview${buildQueryString({ appId, tz })}`
      );
    },
    ...cacheConfig.overview,
  });
}

export function topEventsQuery(
  appId: string,
  dateRange: DateRangeParams | undefined,
  tz: string
) {
  return queryOptions({
    queryKey: queryKeys.events.top(appId, dateRange, tz),
    queryFn: (): Promise<TopEventsResponse> => {
      if (!appId) {
        return Promise.resolve({
          events: [],
          screens: [],
          appId: '',
          startDate: null,
          endDate: null,
        });
      }
      return fetchApi<TopEventsResponse>(
        `/web/events/top${buildQueryString({ ...dateRange, appId, tz })}`
      );
    },
    ...cacheConfig.overview,
  });
}

export function eventTimeseriesQuery(
  appId: string,
  range: TimeRange | DateRangeParams | undefined,
  tz: string
) {
  return queryOptions({
    queryKey: queryKeys.events.timeseries(appId, { range, tz }),
    queryFn: (): Promise<EventTimeseriesResponse> => {
      if (!appId) {
        const now = new Date().toISOString();
        return Promise.resolve({
          data: [],
          period: { startDate: now, endDate: now },
        });
      }
      return fetchApi<EventTimeseriesResponse>(
        `/web/events/timeseries${buildQueryString({
          appId,
          ...toDateRangeParams(range),
          tz,
        })}`
      );
    },
    ...cacheConfig.timeseries,
  });
}

export function useEventOverviewResponse(appId: string) {
  const tz = useTimezoneStore((s) => s.timezone);
  return useSuspenseQuery(eventOverviewQuery(appId, tz));
}

export function useTopEvents(appId: string, dateRange?: DateRangeParams) {
  const tz = useTimezoneStore((s) => s.timezone);
  return useSuspenseQuery(topEventsQuery(appId, dateRange, tz));
}

export function useEventTimeseries(
  appId: string,
  range?: TimeRange | DateRangeParams
) {
  const tz = useTimezoneStore((s) => s.timezone);
  return useSuspenseQuery(eventTimeseriesQuery(appId, range, tz));
}
