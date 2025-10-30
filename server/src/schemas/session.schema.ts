import { z } from '@hono/zod-openapi';
import type { AnalyticsSession } from '@/db/schema';
import {
  dateFilterQuerySchema,
  paginationQuerySchema,
  paginationSchema,
} from './common.schema';

export const sessionSchema = z
  .object({
    sessionId: z.string().openapi({ example: 'session_xyz123' }),
    deviceId: z.string().openapi({ example: 'device_abc123' }),
    startedAt: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-01T00:00:00Z' }),
    endedAt: z
      .string()
      .datetime()
      .nullable()
      .openapi({ example: '2024-01-01T01:00:00Z' }),
  })
  .openapi('Session') satisfies z.ZodType<
  Omit<AnalyticsSession, 'startedAt' | 'endedAt'> & {
    startedAt: string;
    endedAt: string | null;
  }
>;

export const createSessionRequestSchema = z
  .object({
    sessionId: z.string().openapi({ example: 'session_xyz123' }),
    deviceId: z.string().openapi({ example: 'device_abc123' }),
    startedAt: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-01T00:00:00Z' }),
  })
  .openapi('CreateSessionRequest');

export const endSessionRequestSchema = z
  .object({
    sessionId: z.string().openapi({ example: 'session_xyz123' }),
    endedAt: z
      .string()
      .datetime()
      .optional()
      .openapi({ example: '2024-01-01T01:00:00Z' }),
  })
  .openapi('EndSessionRequest');

export const listSessionsQuerySchema = paginationQuerySchema
  .merge(dateFilterQuerySchema)
  .extend({
    deviceId: z.string().optional().openapi({ example: 'device_abc123' }),
  })
  .openapi('ListSessionsQuery');

export const sessionsListResponseSchema = z
  .object({
    sessions: z.array(sessionSchema),
    pagination: paginationSchema,
  })
  .openapi('SessionsListResponse');

export type SessionSchema = z.infer<typeof sessionSchema>;
export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;
export type EndSessionRequest = z.infer<typeof endSessionRequestSchema>;
export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;
export type SessionsListResponse = z.infer<typeof sessionsListResponseSchema>;
