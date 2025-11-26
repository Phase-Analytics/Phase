import { z } from '@hono/zod-openapi';
import {
  dateFilterQuerySchema,
  paginationQuerySchema,
  paginationSchema,
} from './common.schema';

export const eventParamsSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()])
);

export const eventListItemSchema = z
  .object({
    eventId: z.string().openapi({ example: '01JCXYZ5K3QWERTYUIOP01234' }),
    name: z.string().openapi({ example: 'button_clicked' }),
    deviceId: z.string().openapi({ example: 'device_abc123' }),
    timestamp: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-01T00:00:00Z' }),
  })
  .openapi('EventListItem');

export const eventSchema = z
  .object({
    eventId: z.string().openapi({ example: '01JCXYZ5K3QWERTYUIOP01234' }),
    sessionId: z.string().openapi({ example: 'session_xyz123' }),
    name: z.string().openapi({ example: 'button_clicked' }),
    params: eventParamsSchema.nullable().openapi({
      example: { button_id: 'submit_btn', screen: 'checkout' },
    }),
    timestamp: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-01T00:00:00Z' }),
  })
  .openapi('Event');

export const createEventRequestSchema = z
  .object({
    sessionId: z.string().openapi({ example: 'session_xyz123' }),
    name: z.string().openapi({ example: 'button_clicked' }),
    params: eventParamsSchema.optional().openapi({
      example: { button_id: 'submit_btn', screen: 'checkout' },
    }),
    timestamp: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-01T00:00:00Z' }),
  })
  .openapi('CreateEventRequest');

export const listEventsQuerySchema = paginationQuerySchema
  .merge(dateFilterQuerySchema)
  .extend({
    sessionId: z.string().optional().openapi({
      example: 'session_xyz123',
      description:
        'Filter by session ID. If provided, deviceId is ignored (priority: sessionId > deviceId > appId)',
    }),
    deviceId: z.string().optional().openapi({
      example: 'device_abc123',
      description:
        'Filter by device ID. Ignored if sessionId is provided (priority: sessionId > deviceId > appId)',
    }),
    appId: z.string().openapi({
      example: '123456789012345',
      description: 'Required. Filter by app ID',
    }),
    eventName: z.string().optional().openapi({ example: 'button_clicked' }),
  })
  .openapi('ListEventsQuery');

export const eventsListResponseSchema = z
  .object({
    events: z.array(eventListItemSchema),
    pagination: paginationSchema,
  })
  .openapi('EventsListResponse');

export const getEventQuerySchema = z
  .object({
    appId: z.string().openapi({ example: '123456789012345' }),
  })
  .openapi('GetEventQuery');

export const eventOverviewQuerySchema = z
  .object({
    appId: z.string().openapi({ example: '123456789012345' }),
  })
  .openapi('EventOverviewQuery');

export const eventOverviewResponseSchema = z
  .object({
    totalEvents: z.number().int().min(0).openapi({ example: 15_420 }),
    events24h: z.number().int().min(0).openapi({ example: 842 }),
    totalEventsChange24h: z
      .number()
      .openapi({ example: 5.2, description: 'Percentage change in last 24h' }),
    events24hChange: z.number().openapi({
      example: 3.8,
      description: 'Percentage change vs day before yesterday',
    }),
  })
  .openapi('EventOverviewResponse');

export const topEventsQuerySchema = dateFilterQuerySchema
  .extend({
    appId: z.string().openapi({ example: '123456789012345' }),
  })
  .openapi('TopEventsQuery');

export const topEventSchema = z
  .object({
    name: z.string().openapi({ example: 'button_clicked' }),
    count: z.number().int().min(0).openapi({ example: 42 }),
  })
  .openapi('TopEvent');

export const topEventsResponseSchema = z
  .object({
    events: z.array(topEventSchema),
    appId: z.string().openapi({ example: '123456789012345' }),
    startDate: z
      .string()
      .datetime()
      .nullable()
      .openapi({ example: '2024-01-01T00:00:00Z' }),
    endDate: z
      .string()
      .datetime()
      .nullable()
      .openapi({ example: '2024-12-31T23:59:59Z' }),
  })
  .openapi('TopEventsResponse');

export const eventTimeseriesQuerySchema = dateFilterQuerySchema
  .extend({
    appId: z.string().openapi({ example: '123456789012345' }),
  })
  .openapi('EventTimeseriesQuery');

export const eventTimeseriesDataPointSchema = z
  .object({
    date: z.string().openapi({ example: '2024-01-15' }),
    dailyEvents: z.number().int().min(0).openapi({ example: 1234 }),
  })
  .openapi('EventTimeseriesDataPoint');

export const eventTimeseriesResponseSchema = z
  .object({
    data: z.array(eventTimeseriesDataPointSchema),
    period: z.object({
      startDate: z
        .string()
        .datetime()
        .openapi({ example: '2024-01-01T00:00:00Z' }),
      endDate: z
        .string()
        .datetime()
        .openapi({ example: '2024-01-31T23:59:59Z' }),
    }),
  })
  .openapi('EventTimeseriesResponse');

export type EventListItemSchema = z.infer<typeof eventListItemSchema>;
export type EventSchema = z.infer<typeof eventSchema>;
export type CreateEventRequest = z.infer<typeof createEventRequestSchema>;
export type GetEventQuery = z.infer<typeof getEventQuerySchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
export type EventsListResponse = z.infer<typeof eventsListResponseSchema>;
export type EventParams = z.infer<typeof eventParamsSchema>;
export type EventOverviewQuery = z.infer<typeof eventOverviewQuerySchema>;
export type EventOverviewResponse = z.infer<typeof eventOverviewResponseSchema>;
export type TopEventsQuery = z.infer<typeof topEventsQuerySchema>;
export type TopEvent = z.infer<typeof topEventSchema>;
export type TopEventsResponse = z.infer<typeof topEventsResponseSchema>;
export type EventTimeseriesQuery = z.infer<typeof eventTimeseriesQuerySchema>;
export type EventTimeseriesDataPoint = z.infer<
  typeof eventTimeseriesDataPointSchema
>;
export type EventTimeseriesResponse = z.infer<
  typeof eventTimeseriesResponseSchema
>;
