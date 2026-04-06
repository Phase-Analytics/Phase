import type { PublicApiCapabilitiesResponse } from '@phase/shared';

export const PUBLIC_API_MAX_REPORT_RANGE_DAYS = 90;
export const PUBLIC_API_MAX_BREAKDOWN_LIMIT = 50;
export const PUBLIC_API_DEFAULT_BREAKDOWN_LIMIT = 10;
export const PUBLIC_API_MAX_BATCH_SIZE = 5;
export const PUBLIC_API_MAX_RAW_PAGE_SIZE = 50;
export const PUBLIC_API_EVENT_RETENTION_DAYS_APPROX = 365;
export const PUBLIC_API_ONLINE_DEVICES_WINDOW_SECONDS = 20;
export const PUBLIC_API_ACTIVE_DEVICES_WINDOW_SECONDS = 60;

export function getPublicApiMeta() {
  return {
    generatedAt: new Date().toISOString(),
    consistency: 'eventual' as const,
    identityModel: 'device' as const,
  };
}

export function getPublicApiCapabilities(
  appId: string
): PublicApiCapabilitiesResponse {
  return {
    appId,
    identityModel: 'device',
    retention: {
      eventsDaysApprox: PUBLIC_API_EVENT_RETENTION_DAYS_APPROX,
    },
    semantics: {
      bounceRate: 'sessions with duration < 10 seconds',
      onlineDevicesWindowSeconds: PUBLIC_API_ONLINE_DEVICES_WINDOW_SECONDS,
      activeDevicesWindowSeconds: PUBLIC_API_ACTIVE_DEVICES_WINDOW_SECONDS,
      consistency: 'eventual',
    },
    limits: {
      maxReportRangeDays: PUBLIC_API_MAX_REPORT_RANGE_DAYS,
      maxBreakdownLimit: PUBLIC_API_MAX_BREAKDOWN_LIMIT,
      maxBatchSize: PUBLIC_API_MAX_BATCH_SIZE,
      maxRawPageSize: PUBLIC_API_MAX_RAW_PAGE_SIZE,
    },
    domains: {
      events: {
        reports: ['overview', 'timeseries', 'breakdown'],
        metrics: ['eventCount'],
        dimensions: ['eventName', 'screenName', 'date'],
        filters: ['startDate', 'endDate', 'sessionId', 'deviceId', 'eventName'],
      },
      sessions: {
        reports: ['overview', 'timeseries'],
        metrics: [
          'sessionCount',
          'avgSessionDuration',
          'bounceRate',
          'activeSessions24h',
        ],
        dimensions: ['date'],
        filters: ['startDate', 'endDate', 'deviceId'],
      },
      devices: {
        reports: ['overview', 'timeseries', 'breakdown'],
        metrics: [
          'deviceCount',
          'activeDevices',
          'activeDevices24h',
          'activeDevices60s',
          'totalDevices',
        ],
        dimensions: ['platform', 'country', 'city', 'date'],
        filters: ['startDate', 'endDate', 'platform', 'properties'],
      },
      realtime: {
        reports: ['snapshot', 'stream'],
        metrics: ['onlineDevices20s', 'activeDevices60s'],
      },
    },
  };
}
