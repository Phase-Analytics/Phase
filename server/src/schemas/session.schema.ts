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
    lastActivityAt: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-01T00:30:00Z' }),
  })
  .openapi('Session') satisfies z.ZodType<
  Omit<AnalyticsSession, 'startedAt' | 'lastActivityAt'> & {
    startedAt: string;
    lastActivityAt: string;
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
    appVersion: z.string().optional().openapi({ example: '1.2.3' }),
  })
  .openapi('CreateSessionRequest');

export const listSessionsQuerySchema = paginationQuerySchema
  .merge(dateFilterQuerySchema)
  .extend({
    deviceId: z.string().openapi({ example: 'device_abc123' }),
    appId: z.string().openapi({ example: '12345678901234' }),
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
export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;
export type SessionsListResponse = z.infer<typeof sessionsListResponseSchema>;
