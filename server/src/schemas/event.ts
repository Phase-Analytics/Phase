import { t } from 'elysia';

export const EventParamsSchema = t.Any();

export const EventListItemSchema = t.Object({
  eventId: t.String(),
  name: t.String(),
  deviceId: t.String(),
  timestamp: t.String({ format: 'date-time' }),
});

export const EventSchema = t.Object({
  eventId: t.String(),
  sessionId: t.String(),
  deviceId: t.String(),
  name: t.String(),
  params: t.Union([EventParamsSchema, t.Null()]),
  isScreen: t.Boolean(),
  timestamp: t.String({ format: 'date-time' }),
});

const SESSION_ID_MIN_LENGTH = 8;
const SESSION_ID_MAX_LENGTH = 128;
const SESSION_ID_PATTERN = '^[\\w-]+$';
const EVENT_NAME_MIN_LENGTH = 1;
const EVENT_NAME_MAX_LENGTH = 256;
const EVENT_NAME_PATTERN = '^[\\w./-]+$';

export const CreateEventRequestSchema = t.Object({
  sessionId: t.String({
    minLength: SESSION_ID_MIN_LENGTH,
    maxLength: SESSION_ID_MAX_LENGTH,
    pattern: SESSION_ID_PATTERN,
  }),
  name: t.String({
    minLength: EVENT_NAME_MIN_LENGTH,
    maxLength: EVENT_NAME_MAX_LENGTH,
    pattern: EVENT_NAME_PATTERN,
  }),
  params: t.Optional(EventParamsSchema),
  isScreen: t.Boolean(),
  timestamp: t.String({ format: 'date-time' }),
});

export const EventsListResponseSchema = t.Object({
  events: t.Array(EventListItemSchema),
  pagination: t.Object({
    total: t.Number({ minimum: 0 }),
    page: t.Number({ minimum: 1 }),
    pageSize: t.Number({ minimum: 1 }),
    totalPages: t.Number({ minimum: 0 }),
  }),
});

export const EventOverviewResponseSchema = t.Object({
  totalEvents: t.Number({ minimum: 0 }),
  events24h: t.Number({ minimum: 0 }),
  totalEventsChange24h: t.Number(),
  events24hChange: t.Number(),
});

export const TopEventSchema = t.Object({
  name: t.String(),
  count: t.Number({ minimum: 0 }),
});

export const TopEventsResponseSchema = t.Object({
  events: t.Array(TopEventSchema),
  appId: t.String(),
  startDate: t.Union([t.String({ format: 'date-time' }), t.Null()]),
  endDate: t.Union([t.String({ format: 'date-time' }), t.Null()]),
});

export const TopScreenSchema = t.Object({
  name: t.String(),
  count: t.Number({ minimum: 0 }),
});

export const TopScreensResponseSchema = t.Object({
  screens: t.Array(TopScreenSchema),
  appId: t.String(),
  startDate: t.Union([t.String({ format: 'date-time' }), t.Null()]),
  endDate: t.Union([t.String({ format: 'date-time' }), t.Null()]),
});

export const EventTimeseriesDataPointSchema = t.Object({
  date: t.String(),
  dailyEvents: t.Number({ minimum: 0 }),
});

export const EventTimeseriesResponseSchema = t.Object({
  data: t.Array(EventTimeseriesDataPointSchema),
  period: t.Object({
    startDate: t.String({ format: 'date-time' }),
    endDate: t.String({ format: 'date-time' }),
  }),
});

export type EventParams = typeof EventParamsSchema.static;
export type EventListItem = typeof EventListItemSchema.static;
export type Event = typeof EventSchema.static;
export type CreateEventRequest = typeof CreateEventRequestSchema.static;
export type EventsListResponse = typeof EventsListResponseSchema.static;
export type EventOverviewResponse = typeof EventOverviewResponseSchema.static;
export type TopEvent = typeof TopEventSchema.static;
export type TopEventsResponse = typeof TopEventsResponseSchema.static;
export type EventTimeseriesDataPoint =
  typeof EventTimeseriesDataPointSchema.static;
export type EventTimeseriesResponse =
  typeof EventTimeseriesResponseSchema.static;

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
