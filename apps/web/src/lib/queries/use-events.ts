import { useSuspenseQuery } from '@tanstack/react-query';
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

type EventFilters = PaginationQueryParams & {
  eventName?: string;
  sessionId?: string;
  deviceId?: string;
  startDate?: string;
  endDate?: string;
};

export function useEvents(appId: string, filters?: EventFilters) {
  return useSuspenseQuery({
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

export function useEventOverviewResponse(appId: string) {
  return useSuspenseQuery({
    queryKey: queryKeys.events.overview(appId),
    queryFn: () => {
      if (!appId) {
        return Promise.resolve({
          totalEvents: 0,
          totalEventsChange24h: 0,
          events24h: 0,
          events24hChange: 0,
        });
      }
      return fetchApi<EventOverviewResponse>(
        `/web/events/overview?appId=${appId}`
      );
    },
    ...cacheConfig.overview,
  });
}

export function useTopEvents(appId: string, dateRange?: DateRangeParams) {
  return useSuspenseQuery({
    queryKey: queryKeys.events.top(appId, dateRange),
    queryFn: () => {
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
        `/web/events/top${buildQueryString({ ...dateRange, appId })}`
      );
    },
    ...cacheConfig.overview,
  });
}

export function useEventTimeseries(
  appId: string,
  range?: TimeRange | DateRangeParams
) {
  const queryKeyParams = {
    range,
  };

  return useSuspenseQuery({
    queryKey: queryKeys.events.timeseries(appId, queryKeyParams),
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

      return fetchApi<EventTimeseriesResponse>(
        `/web/events/timeseries${buildQueryString({ appId, ...dateParams })}`
      );
    },
    ...cacheConfig.timeseries,
  });
}
