export const VALIDATION = {
  EVENT_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 256,
    PATTERN: /^[\w./ -]+$/,
  },
  EVENT_PARAMS: {
    MAX_SIZE: 8192,
    MAX_KEYS: 32,
    MAX_KEY_LENGTH: 32,
    MAX_STRING_VALUE_LENGTH: 256,
  },
  VERSION: {
    OS_VERSION_MAX_LENGTH: 64,
  },
  LOCALE: {
    MAX_LENGTH: 10,
  },
  MODEL: {
    MAX_LENGTH: 128,
  },
  DEVICE_PROPERTIES: {
    MAX_KEY_LENGTH: 128,
    MAX_SIZE: 50_000,
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
  osVersion?: string | null;
  platform?: Platform | null;
  locale?: string | null;
  model?: string | null;
  properties?: DeviceProperties;
  disableGeolocation?: boolean;
};

export type CreateSessionRequest = {
  sessionId: string;
  deviceId: string;
  startedAt: string;
};

/**
 * Event parameters.
 * Flat primitive object only.
 * Max 32 keys.
 * Max key length 32.
 * Max string value length 256.
 * Max serialized size 8 KB.
 * Empty objects are normalized away.
 * @example
 * { user_id: '123', amount: 99.99, premium: true }
 */
export type EventParams = Record<string, string | number | boolean | null>;

export type CreateEventRequest = {
  /** Client-generated ULID, stable across retries so the server can dedup. */
  eventId?: string;
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
  /** Missing means non-retryable. */
  retryable?: boolean;
};

export type BatchResultItem = {
  clientOrder: number;
  type: 'device' | 'session' | 'event' | 'ping';
  id: string;
};

export type BatchResponse = {
  processed?: number;
  failed?: number;
  errors?: BatchError[];
  results?: BatchResultItem[];
};

export type LogLevel = 'info' | 'warn' | 'error' | 'none';

export type PhaseConfig = {
  /** Phase API key (required, starts with `phase_`) */
  apiKey: string;
  /** Custom API endpoint (optional, default: "https://api.phase.sh") */
  baseUrl?: string;
  /** Logging level (optional, info, warn, error, none, default: "none") */
  logLevel?: LogLevel;
  /** Auto-track screens (optional, default: false) */
  trackNavigation?: boolean;
  /** Mark identify/events as debug data (optional, default: false) */
  debugData?: boolean;
  /** Collect device metadata (optional, default: true) */
  deviceInfo?: boolean;
  /** Collect locale & geolocation (optional, default: true) */
  userLocale?: boolean;
};

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export type DeviceInfo = {
  osVersion: string | null;
  platform: Platform | null;
  locale: string | null;
  model: string | null;
  appVersion: string | null;
};

export const STORAGE_KEYS = {
  DEVICE_ID: 'phase-analytics/device-id',
  DEVICE_INFO: 'phase-analytics/device-info',
  OFFLINE_QUEUE: 'phase-analytics/offline-queue',
  API_KEY: 'phase-analytics/api-key',
} as const;

export type NetworkState = {
  isConnected: boolean;
};
