import { t } from 'elysia';

export const SessionSchema = t.Object({
  sessionId: t.String(),
  deviceId: t.String(),
  startedAt: t.String({ format: 'date-time' }),
  lastActivityAt: t.String({ format: 'date-time' }),
});

export const CreateSessionRequestSchema = t.Object({
  sessionId: t.String(),
  deviceId: t.String(),
  startedAt: t.String({ format: 'date-time' }),
  appVersion: t.Optional(t.String()),
});

export const SessionsListResponseSchema = t.Object({
  sessions: t.Array(SessionSchema),
  pagination: t.Object({
    total: t.Number({ minimum: 0 }),
    page: t.Number({ minimum: 1 }),
    pageSize: t.Number({ minimum: 1 }),
    totalPages: t.Number({ minimum: 0 }),
  }),
});

export const SessionOverviewResponseSchema = t.Object({
  totalSessions: t.Number({ minimum: 0 }),
  averageSessionDuration: t.Union([t.Number(), t.Null()]),
  activeSessions24h: t.Number({ minimum: 0 }),
  bounceRate: t.Number({ minimum: 0, maximum: 100 }),
  totalSessionsChange24h: t.Number(),
  activeSessions24hChange: t.Number(),
  bounceRateChange24h: t.Number(),
});

export const SessionTimeseriesDataPointSchema = t.Object({
  date: t.String(),
  dailySessions: t.Optional(t.Number({ minimum: 0 })),
  avgDuration: t.Optional(t.Number({ minimum: 0 })),
  bounceRate: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
});

export const SessionTimeseriesResponseSchema = t.Object({
  data: t.Array(SessionTimeseriesDataPointSchema),
  period: t.Object({
    startDate: t.String({ format: 'date-time' }),
    endDate: t.String({ format: 'date-time' }),
  }),
});

export type Session = typeof SessionSchema.static;
export type CreateSessionRequest = typeof CreateSessionRequestSchema.static;
export type SessionsListResponse = typeof SessionsListResponseSchema.static;
export type SessionOverviewResponse =
  typeof SessionOverviewResponseSchema.static;
export type SessionTimeseriesDataPoint =
  typeof SessionTimeseriesDataPointSchema.static;
export type SessionTimeseriesResponse =
  typeof SessionTimeseriesResponseSchema.static;

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
