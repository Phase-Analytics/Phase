import { z } from '@hono/zod-openapi';
import type { Event } from '@/db/schema';
import {
  dateFilterQuerySchema,
  paginationQuerySchema,
  paginationSchema,
} from './common.schema';

export const eventParamsSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()])
);

export const eventSchema = z
  .object({
    eventId: z.string().openapi({ example: 'event_abc123' }),
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
  .openapi('Event') satisfies z.ZodType<
  Omit<Event, 'params' | 'timestamp'> & {
    params: Record<string, string | number | boolean | null> | null;
    timestamp: string;
  }
>;

export const createEventRequestSchema = z
  .object({
    eventId: z.string().openapi({ example: 'event_abc123' }),
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
    sessionId: z.string().openapi({ example: 'session_xyz123' }),
    eventName: z.string().optional().openapi({ example: 'button_clicked' }),
  })
  .openapi('ListEventsQuery');

export const eventsListResponseSchema = z
  .object({
    events: z.array(eventSchema),
    pagination: paginationSchema,
  })
  .openapi('EventsListResponse');

export type EventSchema = z.infer<typeof eventSchema>;
export type CreateEventRequest = z.infer<typeof createEventRequestSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
export type EventsListResponse = z.infer<typeof eventsListResponseSchema>;
export type EventParams = z.infer<typeof eventParamsSchema>;
