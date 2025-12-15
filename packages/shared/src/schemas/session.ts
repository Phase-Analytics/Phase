import { z } from 'zod';
import { DEVICE_ID, SESSION_ID } from '../constants/validation';
import { PaginationMetaSchema } from './common';

export const SessionSchema = z.object({
  sessionId: z.string(),
  deviceId: z.string(),
  startedAt: z.string().datetime(),
  lastActivityAt: z.string().datetime(),
});

export const CreateSessionRequestSchema = z.object({
  sessionId: z
    .string()
    .min(SESSION_ID.MIN_LENGTH)
    .max(SESSION_ID.MAX_LENGTH)
    .regex(SESSION_ID.PATTERN),
  deviceId: z
    .string()
    .min(DEVICE_ID.MIN_LENGTH)
    .max(DEVICE_ID.MAX_LENGTH)
    .regex(DEVICE_ID.PATTERN),
  startedAt: z.string().datetime(),
});

export const SessionsListResponseSchema = z.object({
  sessions: z.array(SessionSchema),
  pagination: PaginationMetaSchema,
});

export const SessionOverviewResponseSchema = z.object({
  totalSessions: z.number().min(0),
  averageSessionDuration: z.number().nullable(),
  activeSessions24h: z.number().min(0),
  bounceRate: z.number().min(0).max(100),
  totalSessionsChange24h: z.number(),
  activeSessions24hChange: z.number(),
});

export const SessionTimeseriesDataPointSchema = z.object({
  date: z.string(),
  dailySessions: z.number().min(0).optional(),
  avgDuration: z.number().min(0).optional(),
  bounceRate: z.number().min(0).max(100).optional(),
});

export const SessionTimeseriesResponseSchema = z.object({
  data: z.array(SessionTimeseriesDataPointSchema),
  period: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
});

export type Session = z.infer<typeof SessionSchema>;
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;
export type SessionsListResponse = z.infer<typeof SessionsListResponseSchema>;
export type SessionOverviewResponse = z.infer<
  typeof SessionOverviewResponseSchema
>;
export type SessionTimeseriesDataPoint = z.infer<
  typeof SessionTimeseriesDataPointSchema
>;
export type SessionTimeseriesResponse = z.infer<
  typeof SessionTimeseriesResponseSchema
>;

export type ListSessionsQuery = {
  page?: string;
  pageSize?: string;
  startDate?: string;
  endDate?: string;
  deviceId?: string;
  appId: string;
};

export type SessionOverviewQuery = {
  appId: string;
};

export type SessionTimeseriesQuery = {
  appId: string;
  startDate?: string;
  endDate?: string;
  metric?: 'daily_sessions' | 'avg_duration' | 'bounce_rate';
};

export type SessionMetric = 'daily_sessions' | 'avg_duration' | 'bounce_rate';
