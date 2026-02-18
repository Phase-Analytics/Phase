import { z } from 'zod';
import { EVENT_NAME, SESSION_ID } from '../constants/validation';
import { PaginationMetaSchema } from './common';

export const EventParamsSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()])
);

export const EventListItemSchema = z.object({
  eventId: z.string(),
  name: z.string(),
  deviceId: z.string(),
  isScreen: z.boolean(),
  isDebug: z.boolean(),
  timestamp: z.string().datetime(),
});

export const EventSchema = z.object({
  eventId: z.string(),
  sessionId: z.string(),
  deviceId: z.string(),
  name: z.string(),
  params: EventParamsSchema.nullable(),
  isScreen: z.boolean(),
  isDebug: z.boolean(),
  timestamp: z.string().datetime(),
});

export const CreateEventRequestSchema = z.object({
  sessionId: z
    .string()
    .min(SESSION_ID.MIN_LENGTH)
    .max(SESSION_ID.MAX_LENGTH)
    .regex(SESSION_ID.PATTERN),
  name: z
    .string()
    .min(EVENT_NAME.MIN_LENGTH)
    .max(EVENT_NAME.MAX_LENGTH)
    .regex(EVENT_NAME.PATTERN),
  params: EventParamsSchema.optional(),
  isScreen: z.boolean(),
  timestamp: z.string().datetime(),
});

export const EventsListResponseSchema = z.object({
  events: z.array(EventListItemSchema),
  pagination: PaginationMetaSchema,
});

export const EventOverviewResponseSchema = z.object({
  totalEvents: z.number().min(0),
  events24h: z.number().min(0),
  totalEventsChange24h: z.number(),
  events24hChange: z.number(),
});

export const TopEventSchema = z.object({
  name: z.string(),
  count: z.number().min(0),
});

export const TopEventsResponseSchema = z.object({
  events: z.array(TopEventSchema),
  screens: z.array(TopEventSchema),
  appId: z.string(),
  startDate: z.string().datetime().nullable(),
  endDate: z.string().datetime().nullable(),
});

export const TopScreenSchema = z.object({
  name: z.string(),
  count: z.number().min(0),
});

export const TopScreensResponseSchema = z.object({
  screens: z.array(TopScreenSchema),
  appId: z.string(),
  startDate: z.string().datetime().nullable(),
  endDate: z.string().datetime().nullable(),
});

export const EventTimeseriesDataPointSchema = z.object({
  date: z.string(),
  dailyEvents: z.number().min(0),
});

export const EventTimeseriesResponseSchema = z.object({
  data: z.array(EventTimeseriesDataPointSchema),
  period: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
});

export type EventParams = z.infer<typeof EventParamsSchema>;
export type EventListItem = z.infer<typeof EventListItemSchema>;
export type Event = z.infer<typeof EventSchema>;
export type CreateEventRequest = z.infer<typeof CreateEventRequestSchema>;
export type EventsListResponse = z.infer<typeof EventsListResponseSchema>;
export type EventOverviewResponse = z.infer<typeof EventOverviewResponseSchema>;
export type TopEvent = z.infer<typeof TopEventSchema>;
export type TopEventsResponse = z.infer<typeof TopEventsResponseSchema>;
export type TopScreen = z.infer<typeof TopScreenSchema>;
export type TopScreensResponse = z.infer<typeof TopScreensResponseSchema>;
export type EventTimeseriesDataPoint = z.infer<
  typeof EventTimeseriesDataPointSchema
>;
export type EventTimeseriesResponse = z.infer<
  typeof EventTimeseriesResponseSchema
>;

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
