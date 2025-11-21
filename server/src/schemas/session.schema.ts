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
    totalSessionsChange24h: z
      .number()
      .openapi({ example: 3.1, description: 'Percentage change in last 24h' }),
    activeSessions24hChange: z
      .number()
      .openapi({ example: 2.8, description: 'Percentage change vs yesterday' }),
  })
  .openapi('SessionOverviewResponse');

export const sessionTimeseriesMetricEnum = z.enum([
  'daily_sessions',
  'avg_duration',
]);

export const sessionTimeseriesQuerySchema = z
  .object({
    appId: z.string().openapi({ example: '123456789012345' }),
    startDate: z
      .string()
      .datetime()
      .optional()
      .openapi({ example: '2024-01-01T00:00:00Z' }),
    endDate: z
      .string()
      .datetime()
      .optional()
      .openapi({ example: '2024-01-31T23:59:59Z' }),
    metric: sessionTimeseriesMetricEnum
      .optional()
      .default('daily_sessions')
      .openapi({
        example: 'daily_sessions',
        description:
          'Metric type: daily_sessions (Daily Session Count) or avg_duration (Average Session Duration in seconds)',
      }),
  })
  .openapi('SessionTimeseriesQuery');

export const sessionTimeseriesDataPointSchema = z
  .object({
    date: z.string().openapi({ example: '2024-01-01' }),
    dailySessions: z.number().int().min(0).optional().openapi({ example: 542 }),
    avgDuration: z.number().min(0).optional().openapi({ example: 180.5 }),
  })
  .openapi('SessionTimeseriesDataPoint');

export const sessionTimeseriesResponseSchema = z
  .object({
    data: z.array(sessionTimeseriesDataPointSchema),
    period: z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
    }),
  })
  .openapi('SessionTimeseriesResponse');

export type SessionSchema = z.infer<typeof sessionSchema>;
export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;
export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;
export type SessionsListResponse = z.infer<typeof sessionsListResponseSchema>;
export type SessionOverviewQuery = z.infer<typeof sessionOverviewQuerySchema>;
export type SessionOverviewResponse = z.infer<
  typeof sessionOverviewResponseSchema
>;
export type SessionTimeseriesQuery = z.infer<
  typeof sessionTimeseriesQuerySchema
>;
export type SessionTimeseriesDataPoint = z.infer<
  typeof sessionTimeseriesDataPointSchema
>;
export type SessionTimeseriesResponse = z.infer<
  typeof sessionTimeseriesResponseSchema
>;
