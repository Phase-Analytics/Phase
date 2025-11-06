import { z } from '@hono/zod-openapi';
import {
  dateFilterQuerySchema,
  paginationQuerySchema,
  paginationSchema,
} from './common.schema';

export const errorSchema = z
  .object({
    errorId: z.string().openapi({ example: '01JCXYZ5K3QWERTYUIOP01234' }),
    sessionId: z.string().openapi({ example: 'session_xyz123' }),
    message: z
      .string()
      .openapi({ example: "Cannot read property 'name' of undefined" }),
    type: z.string().openapi({ example: 'TypeError' }),
    stackTrace: z.string().nullable().openapi({
      example: 'LoginScreen.js:67\nButton.js:23\nApp.js:12',
    }),
    timestamp: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-01T00:00:00Z' }),
  })
  .openapi('Error');

export const createErrorRequestSchema = z
  .object({
    sessionId: z.string().openapi({ example: 'session_xyz123' }),
    message: z
      .string()
      .openapi({ example: "Cannot read property 'name' of undefined" }),
    type: z.string().openapi({ example: 'TypeError' }),
    stackTrace: z.string().nullable().openapi({
      example: 'LoginScreen.js:67\nButton.js:23\nApp.js:12',
    }),
    timestamp: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-01T00:00:00Z' }),
  })
  .openapi('CreateErrorRequest');

export const listErrorsQuerySchema = paginationQuerySchema
  .merge(dateFilterQuerySchema)
  .extend({
    sessionId: z.string().optional().openapi({ example: 'session_xyz123' }),
    appId: z.string().openapi({ example: '12345678901234' }),
    type: z.string().optional().openapi({ example: 'TypeError' }),
  })
  .openapi('ListErrorsQuery');

export const errorsListResponseSchema = z
  .object({
    errors: z.array(errorSchema),
    pagination: paginationSchema,
  })
  .openapi('ErrorsListResponse');

export type ErrorSchema = z.infer<typeof errorSchema>;
export type CreateErrorRequest = z.infer<typeof createErrorRequestSchema>;
export type ListErrorsQuery = z.infer<typeof listErrorsQuerySchema>;
export type ErrorsListResponse = z.infer<typeof errorsListResponseSchema>;
