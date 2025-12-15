import type { PaginationMeta } from './common';

export type Session = {
  sessionId: string;
  deviceId: string;
  startedAt: string;
  lastActivityAt: string;
};

export type CreateSessionRequest = {
  sessionId: string;
  deviceId: string;
  startedAt: string;
  appVersion?: string;
};

export type SessionsListResponse = {
  sessions: Session[];
  pagination: PaginationMeta;
};

export type SessionOverviewResponse = {
  totalSessions: number;
  averageSessionDuration: number | null;
  activeSessions24h: number;
  bounceRate: number;
  totalSessionsChange24h: number;
  activeSessions24hChange: number;
};

export type SessionTimeseriesDataPoint = {
  date: string;
  dailySessions?: number;
  avgDuration?: number;
  bounceRate?: number;
};

export type SessionTimeseriesResponse = {
  data: SessionTimeseriesDataPoint[];
  period: {
    startDate: string;
    endDate: string;
  };
};

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
