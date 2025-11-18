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
    appId: z.string().openapi({ example: '123456789012345' }),
  })
  .openapi('ListSessionsQuery');

export const sessionsListResponseSchema = z
  .object({
    sessions: z.array(sessionSchema),
    pagination: paginationSchema,
  })
  .openapi('SessionsListResponse');

export const sessionOverviewQuerySchema = z
  .object({
    appId: z.string().openapi({ example: '123456789012345' }),
  })
  .openapi('SessionOverviewQuery');

export const sessionOverviewResponseSchema = z
  .object({
    totalSessions: z.number().int().min(0).openapi({ example: 5420 }),
    averageSessionDuration: z
      .number()
      .nullable()
      .openapi({ example: 342.5, description: 'Average duration in seconds' }),
    activeSessions24h: z
      .number()
      .int()
      .min(0)
      .openapi({ example: 180, description: 'Sessions started in last 24h' }),
  })
  .openapi('SessionOverviewResponse');

export type SessionSchema = z.infer<typeof sessionSchema>;
export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;
export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;
export type SessionsListResponse = z.infer<typeof sessionsListResponseSchema>;
export type SessionOverviewQuery = z.infer<typeof sessionOverviewQuerySchema>;
export type SessionOverviewResponse = z.infer<
  typeof sessionOverviewResponseSchema
>;
