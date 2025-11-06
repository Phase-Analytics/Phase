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
    sessionId: z.string().optional().openapi({ example: 'session_xyz123' }),
    deviceId: z.string().optional().openapi({ example: 'device_abc123' }),
    appId: z.string().openapi({ example: '123456789012345' }),
    eventName: z.string().optional().openapi({ example: 'button_clicked' }),
  })
  .refine(
    (data) => {
      const hasSession = !!data.sessionId;
      const hasDevice = !!data.deviceId;
      return hasSession || hasDevice;
    },
    {
      message: 'Either sessionId or deviceId is required',
    }
  )
  .refine(
    (data) => {
      const hasSession = !!data.sessionId;
      const hasDevice = !!data.deviceId;
      return !(hasSession && hasDevice);
    },
    {
      message: 'Provide either sessionId or deviceId, not both',
    }
  )
  .openapi('ListEventsQuery');

export const eventsListResponseSchema = z
  .object({
    events: z.array(eventSchema),
    pagination: paginationSchema,
  })
  .openapi('EventsListResponse');

export const topEventsQuerySchema = dateFilterQuerySchema
  .extend({
    appId: z.string().openapi({ example: '123456789012345' }),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .default(5)
      .openapi({ example: 5 }),
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

export type EventSchema = z.infer<typeof eventSchema>;
export type CreateEventRequest = z.infer<typeof createEventRequestSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
export type EventsListResponse = z.infer<typeof eventsListResponseSchema>;
export type EventParams = z.infer<typeof eventParamsSchema>;
export type TopEventsQuery = z.infer<typeof topEventsQuerySchema>;
export type TopEvent = z.infer<typeof topEventSchema>;
export type TopEventsResponse = z.infer<typeof topEventsResponseSchema>;
