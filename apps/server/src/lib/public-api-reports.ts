import type {
  PublicApiEventBreakdownDimension,
  PublicApiSessionBreakdownDimension,
  PublicApiSessionTimeseriesMetric,
  PublicApiUserBreakdownDimension,
  PublicApiUserTimeseriesMetric,
} from '@phase/shared';
import { ErrorCode, HttpStatus } from '@phase/shared';
import { and, count, eq, gte, lte, type SQL, sql } from 'drizzle-orm';
import { db, devices, sessions } from '@/db';
import {
  PUBLIC_API_DEFAULT_BREAKDOWN_LIMIT,
  PUBLIC_API_MAX_BREAKDOWN_LIMIT,
  PUBLIC_API_MAX_REPORT_RANGE_DAYS,
} from '@/lib/public-api-capabilities';
import { cachedRead, READ_CACHE_TTL } from '@/lib/read-cache';
import { DEFAULT_TIME_ZONE, resolveDayRange } from '@/lib/reports/day-range';
import {
  getCumulativeDevices,
  getDailyActiveDevices,
  getDailyNewDevices,
  getDeviceBreakdowns,
  getDeviceCounts,
  normalizePlatform,
} from '@/lib/reports/devices';
import {
  getEventStats,
  getEventTimeseries,
  getTopEvents,
  getTopScreens,
} from '@/lib/reports/events';
import { validateReportDateRange } from '@/lib/reports/range-validation';
import {
  getSessionDailySeries,
  getSessionOverview,
} from '@/lib/reports/sessions';
import type { ValidationResult } from '@/lib/validators';

const INTEGER_REGEX = /^\d+$/;

type ReportRange = {
  appId: string;
  startDate?: string;
  endDate?: string;
  /** IANA zone validated by parseTimeZone; defaults to UTC. */
  timeZone?: string;
};

function getBreakdownLimit(limit?: number): number {
  if (limit === undefined) {
    return PUBLIC_API_DEFAULT_BREAKDOWN_LIMIT;
  }
  if (!Number.isInteger(limit)) {
    throw new RangeError(`Invalid breakdown limit: ${limit}`);
  }
  return Math.max(1, Math.min(limit, PUBLIC_API_MAX_BREAKDOWN_LIMIT));
}

/** Parses the `limit` query string of breakdown endpoints. */
export function parseBreakdownLimit(
  raw: string | undefined
): ValidationResult<number | undefined> {
  if (raw === undefined || raw === '') {
    return { success: true, data: undefined };
  }
  const limit = INTEGER_REGEX.test(raw) ? Number(raw) : Number.NaN;
  if (!Number.isSafeInteger(limit) || limit < 1) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: `Invalid limit: must be an integer between 1 and ${PUBLIC_API_MAX_BREAKDOWN_LIMIT}`,
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }
  return { success: true, data: limit };
}

/** Date validation plus the 365-day cap, also when only startDate is set. */
export function validatePublicReportDateRange(
  startDate?: string,
  endDate?: string
): ValidationResult<void> {
  return validateReportDateRange(
    startDate,
    endDate,
    PUBLIC_API_MAX_REPORT_RANGE_DAYS
  );
}

function dayRange(options: ReportRange, defaultDays: number) {
  return resolveDayRange({
    startDate: options.startDate,
    endDate: options.endDate,
    defaultDays,
    timeZone: options.timeZone ?? DEFAULT_TIME_ZONE,
  });
}

function percentChange(current: number, previous: number): number {
  return Number(
    (((current - previous) / Math.max(previous, 1)) * 100).toFixed(2)
  );
}

export function getPublicEventOverview(appId: string) {
  return getEventStats({ appId });
}

export async function getPublicEventTimeseries(options: ReportRange) {
  const result = await getEventTimeseries({
    appId: options.appId,
    startDate: options.startDate,
    endDate: options.endDate,
    timeZone: options.timeZone ?? DEFAULT_TIME_ZONE,
  });

  return {
    data: result.data.map((row) => ({
      date: row.date,
      eventCount: row.dailyEvents,
    })),
    period: result.period,
  };
}

export async function getPublicEventBreakdown(
  options: ReportRange & {
    dimension: PublicApiEventBreakdownDimension;
    limit?: number;
  }
) {
  const query = {
    appId: options.appId,
    startDate: options.startDate,
    endDate: options.endDate,
    limit: getBreakdownLimit(options.limit),
  };

  const rows =
    options.dimension === 'eventName'
      ? (await getTopEvents(query)).events
      : await getTopScreens(query);

  return rows.map((row) => ({ value: row.name, count: row.count }));
}

export function getPublicSessionOverview(appId: string) {
  return getSessionOverview(appId);
}

export async function getPublicSessionTimeseries(
  options: ReportRange & { metric: PublicApiSessionTimeseriesMetric }
) {
  const range = dayRange(options, 7);
  const series = await getSessionDailySeries(options.appId, range);

  const data = series.map((point) => {
    if (options.metric === 'sessionCount') {
      return { date: point.date, sessionCount: point.sessions };
    }
    if (options.metric === 'bounceRate') {
      return { date: point.date, bounceRate: point.bounceRate };
    }
    return { date: point.date, avgSessionDuration: point.avgDuration };
  });

  return { data, period: range.period };
}

type BreakdownRow = { value: string; count: number };

function cachedBreakdown(
  appId: string,
  scope: string,
  params: Record<string, unknown>,
  load: () => Promise<BreakdownRow[]>
): Promise<BreakdownRow[]> {
  return cachedRead(
    { appId, scope, params, ttlSeconds: READ_CACHE_TTL.standard },
    load
  );
}

export function getPublicSessionBreakdown(
  options: ReportRange & {
    dimension: PublicApiSessionBreakdownDimension;
    limit?: number;
  }
) {
  const limit = getBreakdownLimit(options.limit);
  const filters: SQL[] = [eq(devices.appId, options.appId)];
  if (options.startDate) {
    filters.push(gte(sessions.startedAt, new Date(options.startDate)));
  }
  if (options.endDate) {
    filters.push(lte(sessions.startedAt, new Date(options.endDate)));
  }

  const column =
    options.dimension === 'platform' ? devices.platform : devices.country;

  return cachedBreakdown(
    options.appId,
    `public:sessions-by-${options.dimension}`,
    { startDate: options.startDate, endDate: options.endDate, limit },
    async () => {
      const rows = await db
        .select({
          value: sql<string>`COALESCE(${column}, 'unknown')`,
          count: count(),
        })
        .from(sessions)
        .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
        .where(and(...filters))
        .groupBy(column)
        .orderBy(sql`count DESC`)
        .limit(limit);

      return rows.map((row) => ({
        value:
          options.dimension === 'platform'
            ? (normalizePlatform(row.value) ?? 'unknown')
            : row.value,
        count: Number(row.count),
      }));
    }
  );
}

export async function getPublicUserOverview(appId: string) {
  const [counts, breakdowns] = await Promise.all([
    getDeviceCounts(appId),
    getDeviceBreakdowns(appId),
  ]);

  const totalUsersYesterday = counts.total - counts.firstSeenSince24h;

  return {
    totalUsers: counts.total,
    activeUsers24h: counts.active24h,
    newUsers24h: counts.new24h,
    platformStats: breakdowns.platformStats,
    countryStats: breakdowns.countryStats,
    totalUsersChange24h: percentChange(counts.total, totalUsersYesterday),
    activeUsers24hChange: percentChange(
      counts.active24h,
      counts.activeYesterday
    ),
    newUsers24hChange: percentChange(counts.new24h, counts.newYesterday),
  };
}

export async function getPublicUserTimeseries(
  options: ReportRange & { metric: PublicApiUserTimeseriesMetric }
) {
  const range = dayRange(options, 7);

  if (options.metric === 'activeUsers') {
    const series = await getDailyActiveDevices(options.appId, range);
    return {
      data: series.map(({ date, count: value }) => ({
        date,
        activeUsers: value,
      })),
      period: range.period,
    };
  }

  if (options.metric === 'newUsers') {
    const series = await getDailyNewDevices(options.appId, range);
    return {
      data: series.map(({ date, count: value }) => ({ date, newUsers: value })),
      period: range.period,
    };
  }

  const series = await getCumulativeDevices(options.appId, range);
  return {
    data: series.map(({ date, count: value }) => ({ date, totalUsers: value })),
    period: range.period,
  };
}

export function getPublicUserBreakdown(options: {
  appId: string;
  dimension: PublicApiUserBreakdownDimension;
  limit?: number;
}) {
  const limit = getBreakdownLimit(options.limit);
  const column =
    options.dimension === 'platform' ? devices.platform : devices.country;

  return cachedBreakdown(
    options.appId,
    `public:users-by-${options.dimension}`,
    { limit },
    async () => {
      const rows = await db
        .select({
          value: sql<string>`COALESCE(${column}, 'unknown')`,
          count: count(),
        })
        .from(devices)
        .where(eq(devices.appId, options.appId))
        .groupBy(column)
        .orderBy(sql`count DESC`)
        .limit(limit);

      return rows.map((row) => ({
        value:
          options.dimension === 'platform'
            ? (normalizePlatform(row.value) ?? 'unknown')
            : row.value,
        count: Number(row.count),
      }));
    }
  );
}
