export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type HttpStatus = (typeof HttpStatus)[keyof typeof HttpStatus];

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  CONFLICT: 'CONFLICT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export type ErrorResponse<
  TMeta extends Record<string, unknown> | undefined = undefined,
> = {
  code: ErrorCode;
  detail: string;
  meta?: TMeta;
};

export type PaginationParams = {
  page?: string;
  pageSize?: string;
};

export type PaginationResponse = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type DateRangeParams = {
  startDate?: string;
  endDate?: string;
};

export type TimeRange = '7d' | '30d' | '180d' | '360d';

export type Platform = 'ios' | 'android' | 'web';

export type DevicesListResponse = {
  devices: Device[];
  pagination: PaginationResponse;
};

export type SessionsListResponse = {
  sessions: Session[];
  pagination: PaginationResponse;
};

export type EventsListResponse = {
  events: EventListItem[];
  pagination: PaginationResponse;
};

export type Device = {
  deviceId: string;
  identifier: string | null;
  platform: Platform | null;
  country: string | null;
};

export interface DeviceDetail extends Device {
  model: string | null;
  osVersion: string | null;
  appVersion: string | null;
  firstSeen: string;
  lastActivityAt: string | null;
  totalSessions: number;
  avgSessionDuration: number | null;
}

export type DeviceOverview = {
  totalDevices: number;
  activeDevices24h: number;
  platformStats: Record<string, number>;
  countryStats: Record<string, number>;
  totalDevicesChange24h: number;
  activeDevicesChange24h: number;
};

export type DeviceMetric = 'dau' | 'total';

export type DeviceTimeseriesDataPoint = {
  date: string;
  activeUsers?: number;
  totalUsers?: number;
};

export type DeviceTimeseriesResponse = {
  data: DeviceTimeseriesDataPoint[];
  period: {
    startDate: string;
    endDate: string;
  };
};

export type DeviceLive = {
  activeNow: number;
};

export type Session = {
  sessionId: string;
  deviceId: string;
  startedAt: string;
  lastActivityAt: string;
};

export type SessionOverview = {
  totalSessions: number;
  averageSessionDuration: number | null;
  activeSessions24h: number;
  totalSessionsChange24h: number;
  activeSessions24hChange: number;
};

export type SessionMetric = 'daily_sessions' | 'avg_duration';

export type SessionTimeseriesDataPoint = {
  date: string;
  dailySessions?: number;
  avgDuration?: number;
};

export type SessionTimeseriesResponse = {
  data: SessionTimeseriesDataPoint[];
  period: {
    startDate: string;
    endDate: string;
  };
};

export type EventListItem = {
  eventId: string;
  name: string;
  timestamp: string;
};

export type EventDetail = {
  eventId: string;
  sessionId: string;
  name: string;
  params: Record<string, string | number | boolean | null> | null;
  timestamp: string;
};

export type EventOverview = {
  totalEvents: number;
  events24h: number;
  totalEventsChange24h: number;
  events24hChange: number;
};

export type TopEvent = {
  name: string;
  count: number;
};

export type TopEventsResponse = {
  events: TopEvent[];
  appId: string;
  startDate: string | null;
  endDate: string | null;
};

export type App = {
  id: string;
  name: string;
  role: 'owner' | 'member';
};

export type AppCreated = {
  id: string;
  name: string;
  image: string | null;
  createdAt: string;
};

export type AppsListResponse = {
  apps: App[];
};

export type AppKeysResponse = {
  key: string;
  keyRotatedAt: string | null;
};

export type AppTeamMember = {
  userId: string;
  email: string;
  name: string | null;
};

export type AppTeamResponse = {
  owner: AppTeamMember;
  members: AppTeamMember[];
};

export type CreateAppRequest = {
  name: string;
  image?: string;
};

export type UpdateAppRequest = {
  name: string;
};

export type AddTeamMemberRequest = {
  email: string;
};

export type AddTeamMemberResponse = {
  userId: string;
  email: string;
};

export type AppDetail = {
  id: string;
  name: string;
  image: string | null;
  createdAt: string;
  role: 'owner' | 'member';
};
