import type { PaginationMeta } from './common';

export type EventParams = unknown;

export type EventListItem = {
  eventId: string;
  name: string;
  deviceId: string;
  isScreen: boolean;
  timestamp: string;
};

export type Event = {
  eventId: string;
  sessionId: string;
  deviceId: string;
  name: string;
  params: EventParams | null;
  isScreen: boolean;
  timestamp: string;
};

export type CreateEventRequest = {
  sessionId: string;
  name: string;
  params?: EventParams;
  isScreen: boolean;
  timestamp: string;
};

export type EventsListResponse = {
  events: EventListItem[];
  pagination: PaginationMeta;
};

export type EventOverviewResponse = {
  totalEvents: number;
  events24h: number;
  totalEventsChange24h: number;
  events24hChange: number;
};

export type TopEvent = {
  name: string;
  count: number;
};

export type TopEventsResponse = {
  events: TopEvent[];
  appId: string;
  startDate: string | null;
  endDate: string | null;
};

export type TopScreen = {
  name: string;
  count: number;
};

export type TopScreensResponse = {
  screens: TopScreen[];
  appId: string;
  startDate: string | null;
  endDate: string | null;
};

export type EventTimeseriesDataPoint = {
  date: string;
  dailyEvents: number;
};

export type EventTimeseriesResponse = {
  data: EventTimeseriesDataPoint[];
  period: {
    startDate: string;
    endDate: string;
  };
};

export type ListEventsQuery = {
  page?: string;
  pageSize?: string;
  startDate?: string;
  endDate?: string;
  sessionId?: string;
  deviceId?: string;
  appId: string;
  eventName?: string;
};

export type GetEventQuery = {
  appId: string;
};

export type EventOverviewQuery = {
  appId: string;
};

export type TopEventsQuery = {
  appId: string;
  startDate?: string;
  endDate?: string;
};

export type EventTimeseriesQuery = {
  appId: string;
  startDate?: string;
  endDate?: string;
};
