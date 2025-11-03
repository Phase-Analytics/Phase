import { z } from '@hono/zod-openapi';
import {
  dateFilterQuerySchema,
  paginationQuerySchema,
  paginationSchema,
} from './common.schema';

export const eventActivitySchema = z
  .object({
    type: z.literal('event').openapi({ example: 'event' }),
    id: z.string().openapi({ example: '01JCXYZ5K3QWERTYUIOP01234' }),
    sessionId: z.string().openapi({ example: 'session_xyz123' }),
    timestamp: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-01T00:00:00Z' }),
    data: z.object({
      name: z.string().openapi({ example: 'button_clicked' }),
      params: z
        .record(
          z.string(),
          z.union([z.string(), z.number(), z.boolean(), z.null()])
        )
        .nullable()
        .openapi({ example: { button_name: 'login', screen: 'home' } }),
    }),
  })
  .openapi('EventActivity');

export const errorActivitySchema = z
  .object({
    type: z.literal('error').openapi({ example: 'error' }),
    id: z.string().openapi({ example: '01JCXYZ5K3QWERTYUIOP01234' }),
    sessionId: z.string().openapi({ example: 'session_xyz123' }),
    timestamp: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-01T00:00:00Z' }),
    data: z.object({
      message: z
        .string()
        .openapi({ example: "Cannot read property 'name' of undefined" }),
      type: z.string().openapi({ example: 'TypeError' }),
      stackTrace: z.string().nullable().openapi({
        example: 'LoginScreen.js:67\nButton.js:23\nApp.js:12',
      }),
    }),
  })
  .openapi('ErrorActivity');

export const activityItemSchema = z
  .union([eventActivitySchema, errorActivitySchema])
  .openapi('ActivityItem');

export const listActivityQuerySchema = paginationQuerySchema
  .merge(dateFilterQuerySchema)
  .extend({
    sessionId: z.string().openapi({ example: 'session_xyz123' }),
    apiKeyId: z.string().openapi({ example: 'apikey_abc123' }),
  })
  .openapi('ListActivityQuery');

export const activityListResponseSchema = z
  .object({
    activities: z.array(activityItemSchema),
    pagination: paginationSchema,
  })
  .openapi('ActivityListResponse');

export type EventActivity = z.infer<typeof eventActivitySchema>;
export type ErrorActivity = z.infer<typeof errorActivitySchema>;
export type ActivityItem = z.infer<typeof activityItemSchema>;
export type ListActivityQuery = z.infer<typeof listActivityQuerySchema>;
export type ActivityListResponse = z.infer<typeof activityListResponseSchema>;
