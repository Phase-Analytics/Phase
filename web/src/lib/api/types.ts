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

export type ListResponse<T> = {
  data: T[];
  pagination: PaginationResponse;
};

export type Device = {
  deviceId: string;
  identifier: string | null;
  platform: string | null;
};

export interface DeviceDetail extends Device {
  model: string | null;
  osVersion: string | null;
  appVersion: string | null;
  firstSeen: string;
  lastActivity: string | null;
  totalSessions: number;
}

export type DeviceOverview = {
  totalDevices: number;
  activeDevices24h: number;
  platformStats: Record<string, number>;
};

export type DeviceLive = {
  activeNow: number;
  devices: Array<{
    deviceId: string;
    identifier: string | null;
    platform: string | null;
    lastActivityAt: string;
  }>;
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
