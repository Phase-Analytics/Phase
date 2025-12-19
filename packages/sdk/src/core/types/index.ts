export const VALIDATION = {
  DEVICE_ID: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    PATTERN: /^[\w-]+$/,
  },
  SESSION_ID: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    PATTERN: /^[\w-]+$/,
  },
  EVENT_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 256,
    PATTERN: /^[\w./-]+$/,
  },
  EVENT_PARAMS: {
    MAX_SIZE: 50_000,
  },
  BATCH: {
    MAX_SIZE: 5000,
  },
  VERSION: {
    OS_VERSION_MAX_LENGTH: 64,
  },
  LOCALE: {
    MAX_LENGTH: 10,
  },
} as const;

export type Platform = 'ios' | 'android';
export type DeviceType = 'phone' | 'tablet' | 'desktop';

/**
 * Custom device attributes (optional, primitives only)
 * @example
 * { app_version: '1.2.3', user_tier: 'premium', beta: true }
 */
export type DeviceProperties = Record<string, string | number | boolean | null>;

export type CreateDeviceRequest = {
  deviceId: string;
  deviceType?: DeviceType | null;
  osVersion?: string | null;
  platform?: Platform | null;
  locale?: string | null;
  properties?: DeviceProperties;
  disableGeolocation?: boolean;
};

export type CreateSessionRequest = {
  sessionId: string;
  deviceId: string;
  startedAt: string;
};

/**
 * Event parameters (optional, primitives only)
 * @example
 * { user_id: '123', amount: 99.99, premium: true }
 */
export type EventParams = Record<string, string | number | boolean | null>;

export type CreateEventRequest = {
  sessionId: string;
  name: string;
  params?: EventParams;
  isScreen: boolean;
  timestamp: string;
};

export type PingSessionRequest = {
  sessionId: string;
  timestamp: string;
};

export type BatchDeviceItem = {
  type: 'device';
  payload: CreateDeviceRequest;
  clientOrder: number;
  retryCount?: number;
};

export type BatchSessionItem = {
  type: 'session';
  payload: CreateSessionRequest;
  clientOrder: number;
  retryCount?: number;
};

export type BatchEventItem = {
  type: 'event';
  payload: CreateEventRequest;
  clientOrder: number;
  retryCount?: number;
};

export type BatchPingItem = {
  type: 'ping';
  payload: PingSessionRequest;
  clientOrder: number;
  retryCount?: number;
};

export type BatchItem =
  | BatchDeviceItem
  | BatchSessionItem
  | BatchEventItem
  | BatchPingItem;

export type BatchRequest = {
  items: BatchItem[];
};

export type BatchError = {
  clientOrder: number;
  code: string;
  detail: string;
};

export type BatchResultItem = {
  clientOrder: number;
  type: 'device' | 'session' | 'event' | 'ping';
  id: string;
};

export type BatchResponse = {
  processed: number;
  failed: number;
  errors: BatchError[];
  results: BatchResultItem[];
};

export type DeviceResponse = {
  deviceId: string;
  deviceType: DeviceType | null;
  osVersion: string | null;
  platform: Platform | null;
  locale: string | null;
  country: string | null;
  city: string | null;
  firstSeen: string;
};

export type SessionResponse = {
  sessionId: string;
  deviceId: string;
  startedAt: string;
  lastActivityAt: string;
};

export type EventResponse = {
  eventId: string;
  sessionId: string;
  deviceId: string;
  name: string;
  params: EventParams | null;
  isScreen: boolean;
  timestamp: string;
};

export type PingSessionResponse = {
  sessionId: string;
  lastActivityAt: string;
};

export type LogLevel = 'debug' | 'info' | 'error' | 'none';

export type PhaseConfig = {
  /** Phase API key (required, starts with `phase_`) */
  apiKey: string;
  /** Custom API endpoint (optional, default: "https://api.phase.sh") */
  baseUrl?: string;
  /** Logging level (optional, default: "none") */
  logLevel?: LogLevel;
  /** Auto-track screens (optional, default: false) */
  trackNavigation?: boolean;
  /** Collect device metadata (optional, default: true) */
  deviceInfo?: boolean;
  /** Collect locale & geolocation (optional, default: true) */
  userLocale?: boolean;
};

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export type DeviceInfo = {
  deviceType: DeviceType | null;
  osVersion: string | null;
  platform: Platform | null;
  locale: string | null;
};

export const STORAGE_KEYS = {
  DEVICE_ID: 'phase-analytics/device-id',
  DEVICE_INFO: 'phase-analytics/device-info',
  OFFLINE_QUEUE: 'phase-analytics/offline-queue',
} as const;

export type NetworkState = {
  isConnected: boolean;
};

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }

  isRetryable(): boolean {
    if (this.status >= 500 && this.status < 600) {
      return true;
    }
    return false;
  }
}
