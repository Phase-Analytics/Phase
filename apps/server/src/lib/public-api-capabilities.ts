export const PUBLIC_API_MAX_REPORT_RANGE_DAYS = 365;
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
    identityModel: 'user' as const,
  };
}
