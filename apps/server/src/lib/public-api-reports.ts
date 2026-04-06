import type {
  Platform,
  PublicApiDeviceBreakdownDimension,
  PublicApiDeviceTimeseriesMetric,
  PublicApiEventBreakdownDimension,
  PublicApiSessionTimeseriesMetric,
} from '@phase/shared';
import { ErrorCode, HttpStatus } from '@phase/shared';
import { and, count, countDistinct, eq, gte, lt, lte, sql } from 'drizzle-orm';
import { db, devices, sessions } from '@/db';
import {
  PUBLIC_API_DEFAULT_BREAKDOWN_LIMIT,
  PUBLIC_API_MAX_BREAKDOWN_LIMIT,
  PUBLIC_API_MAX_REPORT_RANGE_DAYS,
} from '@/lib/public-api-capabilities';
import {
  getEventStats,
  getEventTimeseries,
  getTopEvents,
  getTopScreens,
} from '@/lib/questdb';
import { type ValidationResult, validateDateRange } from '@/lib/validators';

function normalizePlatform(
  platform: string | null | undefined
): Platform | null {
  if (!platform) {
    return null;
  }

  const lower = platform.toLowerCase();
  if (lower === 'ios' || lower === 'android') {
    return lower as Platform;
  }

  return 'unknown';
}

export function validatePublicReportDateRange(
  startDate?: string,
  endDate?: string
): ValidationResult<void> {
  const baseValidation = validateDateRange(startDate, endDate);
  if (!baseValidation.success) {
    return baseValidation;
  }

  if (!(startDate && endDate)) {
    return baseValidation;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  const maxRangeMs = PUBLIC_API_MAX_REPORT_RANGE_DAYS * 24 * 60 * 60 * 1000;

  if (diffMs > maxRangeMs) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        detail: `Date range cannot exceed ${PUBLIC_API_MAX_REPORT_RANGE_DAYS} days`,
        status: HttpStatus.BAD_REQUEST,
      },
    };
  }

  return baseValidation;
}

export async function getPublicEventOverview(appId: string) {
  return await getEventStats({ appId });
}

export async function getPublicEventTimeseries(options: {
  appId: string;
  startDate?: string;
  endDate?: string;
}) {
  const result = await getEventTimeseries(options);

  return {
    data: result.data.map((row) => ({
      date: row.date,
      eventCount: row.dailyEvents,
    })),
    period: result.period,
  };
}

export async function getPublicEventBreakdown(options: {
  appId: string;
  dimension: PublicApiEventBreakdownDimension;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const limit = Math.max(
    1,
    Math.min(
      Math.floor(options.limit ?? PUBLIC_API_DEFAULT_BREAKDOWN_LIMIT),
      PUBLIC_API_MAX_BREAKDOWN_LIMIT
    )
  );

  if (options.dimension === 'eventName') {
    const { events } = await getTopEvents({
      appId: options.appId,
      startDate: options.startDate,
      endDate: options.endDate,
      limit,
    });

    return events.map((row) => ({
      value: row.name,
      count: row.count,
    }));
  }

  const screens = await getTopScreens({
    appId: options.appId,
    startDate: options.startDate,
    endDate: options.endDate,
    limit,
  });

  return screens.map((row) => ({
    value: row.name,
    count: row.count,
  }));
}

export async function getPublicSessionOverview(appId: string) {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

  const deviceIdsSubquery = db
    .select({ deviceId: devices.deviceId })
    .from(devices)
    .where(eq(devices.appId, appId));

  const [
    [{ count: totalSessions }],
    [{ count: totalSessionsYesterday }],
    activeSessions24hResult,
    activeSessionsYesterdayResult,
    avgDurationResult,
    bouncedSessionsResult,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(sessions)
      .where(
        sql`${sessions.deviceId} IN (SELECT device_id FROM (${deviceIdsSubquery}) AS app_devices)`
      ),

    db
      .select({ count: count() })
      .from(sessions)
      .where(
        and(
          sql`${sessions.deviceId} IN (SELECT device_id FROM (${deviceIdsSubquery}) AS app_devices)`,
          lt(sessions.startedAt, twentyFourHoursAgo)
        )
      ),

    db
      .select({ count: count() })
      .from(sessions)
      .where(
        and(
          sql`${sessions.deviceId} IN (SELECT device_id FROM (${deviceIdsSubquery}) AS app_devices)`,
          gte(sessions.startedAt, twentyFourHoursAgo),
          lte(sessions.startedAt, now)
        )
      ),

    db
      .select({ count: count() })
      .from(sessions)
      .where(
        and(
          sql`${sessions.deviceId} IN (SELECT device_id FROM (${deviceIdsSubquery}) AS app_devices)`,
          gte(sessions.startedAt, fortyEightHoursAgo),
          lt(sessions.startedAt, twentyFourHoursAgo)
        )
      ),

    db
      .select({
        avg: sql<number | null>`AVG(
          EXTRACT(EPOCH FROM (${sessions.lastActivityAt} - ${sessions.startedAt}))
        )`,
      })
      .from(sessions)
      .where(
        and(
          sql`${sessions.deviceId} IN (SELECT device_id FROM (${deviceIdsSubquery}) AS app_devices)`,
          lt(sessions.startedAt, thirtySecondsAgo)
        )
      ),

    db
      .select({ count: count() })
      .from(sessions)
      .where(
        and(
          sql`${sessions.deviceId} IN (SELECT device_id FROM (${deviceIdsSubquery}) AS app_devices)`,
          sql`EXTRACT(EPOCH FROM (${sessions.lastActivityAt} - ${sessions.startedAt})) < 10`
        )
      ),
  ]);

  const totalSessionsNum = Number(totalSessions);
  const totalSessionsYesterdayNum = Number(totalSessionsYesterday);
  const activeSessions24h = Number(activeSessions24hResult[0]?.count ?? 0);
  const activeSessionsYesterday = Number(
    activeSessionsYesterdayResult[0]?.count ?? 0
  );
  const bouncedSessions = Number(bouncedSessionsResult[0]?.count ?? 0);

  const averageSessionDuration = avgDurationResult[0]?.avg
    ? Number(avgDurationResult[0].avg)
    : null;

  const bounceRate =
    totalSessionsNum > 0
      ? Number(((bouncedSessions / totalSessionsNum) * 100).toFixed(2))
      : 0;

  const totalSessionsYesterdayForCalc = Math.max(totalSessionsYesterdayNum, 1);
  const totalSessionsChange24h =
    ((totalSessionsNum - totalSessionsYesterdayNum) /
      totalSessionsYesterdayForCalc) *
    100;

  const activeSessionsYesterdayForCalc = Math.max(activeSessionsYesterday, 1);
  const activeSessions24hChange =
    ((activeSessions24h - activeSessionsYesterday) /
      activeSessionsYesterdayForCalc) *
    100;

  return {
    totalSessions: totalSessionsNum,
    averageSessionDuration,
    activeSessions24h,
    totalSessionsChange24h: Number(totalSessionsChange24h.toFixed(2)),
    activeSessions24hChange: Number(activeSessions24hChange.toFixed(2)),
    bounceRate,
  };
}

export async function getPublicSessionTimeseries(options: {
  appId: string;
  startDate?: string;
  endDate?: string;
  metric: PublicApiSessionTimeseriesMetric;
}) {
  const now = new Date();
  const defaultStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const start = options.startDate ? new Date(options.startDate) : defaultStart;
  const end = options.endDate ? new Date(options.endDate) : now;

  if (options.metric === 'sessionCount') {
    const result = await db.execute<{
      date: string;
      sessionCount: number;
    }>(sql`
      WITH date_series AS (
        SELECT DATE(generate_series(
          ${start}::timestamp,
          ${end}::timestamp,
          '1 day'::interval
        )) as date
      )
      SELECT
        ds.date::text,
        COALESCE(COUNT(s.session_id), 0)::int as "sessionCount"
      FROM date_series ds
      LEFT JOIN (
        SELECT s.session_id, s.started_at
        FROM sessions_analytics s
        INNER JOIN devices d ON s.device_id = d.device_id
        WHERE d.app_id = ${options.appId}
      ) s ON DATE(s.started_at) = ds.date
      WHERE ds.date <= CURRENT_DATE
      GROUP BY ds.date
      ORDER BY ds.date
    `);

    return {
      data: result.rows.map((row) => ({
        date: row.date,
        sessionCount: Number(row.sessionCount),
      })),
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    };
  }

  if (options.metric === 'bounceRate') {
    const result = await db.execute<{
      date: string;
      bounceRate: number;
    }>(sql`
      WITH date_series AS (
        SELECT DATE(generate_series(
          ${start}::timestamp,
          ${end}::timestamp,
          '1 day'::interval
        )) as date
      )
      SELECT
        ds.date::text,
        COALESCE(
          (SUM(CASE WHEN EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at)) < 10 THEN 1 ELSE 0 END)::float
          / NULLIF(COUNT(s.session_id), 0)) * 100,
          0
        )::float as "bounceRate"
      FROM date_series ds
      LEFT JOIN (
        SELECT s.session_id, s.started_at, s.last_activity_at
        FROM sessions_analytics s
        INNER JOIN devices d ON s.device_id = d.device_id
        WHERE d.app_id = ${options.appId}
      ) s ON DATE(s.started_at) = ds.date
      WHERE ds.date <= CURRENT_DATE
      GROUP BY ds.date
      ORDER BY ds.date
    `);

    return {
      data: result.rows.map((row) => ({
        date: row.date,
        bounceRate: Number(row.bounceRate.toFixed(2)),
      })),
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    };
  }

  const result = await db.execute<{
    date: string;
    avgSessionDuration: number;
  }>(sql`
    WITH date_series AS (
      SELECT DATE(generate_series(
        ${start}::timestamp,
        ${end}::timestamp,
        '1 day'::interval
      )) as date
    )
    SELECT
      ds.date::text,
      COALESCE(
        AVG(EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at))),
        0
      )::float as "avgSessionDuration"
    FROM date_series ds
    LEFT JOIN (
      SELECT s.started_at, s.last_activity_at
      FROM sessions_analytics s
      INNER JOIN devices d ON s.device_id = d.device_id
      WHERE d.app_id = ${options.appId}
    ) s ON DATE(s.started_at) = ds.date
    WHERE ds.date <= CURRENT_DATE
    GROUP BY ds.date
    ORDER BY ds.date
  `);

  return {
    data: result.rows.map((row) => ({
      date: row.date,
      avgSessionDuration: Number(row.avgSessionDuration),
    })),
    period: {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
  };
}

export async function getPublicDeviceOverview(appId: string) {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const deviceIdsSubquery = db
    .select({ deviceId: devices.deviceId })
    .from(devices)
    .where(eq(devices.appId, appId));

  const [
    [{ count: totalDevices }],
    [{ count: totalDevicesYesterday }],
    [{ count: activeDevices24h }],
    [{ count: activeDevicesYesterday }],
    platformStatsResult,
    countryStatsResult,
    cityStatsResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(devices).where(eq(devices.appId, appId)),

    db
      .select({ count: count() })
      .from(devices)
      .where(
        and(eq(devices.appId, appId), lt(devices.firstSeen, twentyFourHoursAgo))
      ),

    db
      .select({ count: countDistinct(sessions.deviceId) })
      .from(sessions)
      .where(
        and(
          sql`${sessions.deviceId} IN (SELECT device_id FROM (${deviceIdsSubquery}) AS app_devices)`,
          gte(sessions.lastActivityAt, twentyFourHoursAgo),
          lte(sessions.lastActivityAt, now)
        )
      ),

    db
      .select({ count: countDistinct(sessions.deviceId) })
      .from(sessions)
      .where(
        and(
          sql`${sessions.deviceId} IN (SELECT device_id FROM (${deviceIdsSubquery}) AS app_devices)`,
          gte(sessions.lastActivityAt, fortyEightHoursAgo),
          lt(sessions.lastActivityAt, twentyFourHoursAgo)
        )
      ),

    db
      .select({
        platform: sql<string>`COALESCE(${devices.platform}, 'unknown')`,
        count: count(),
      })
      .from(devices)
      .where(eq(devices.appId, appId))
      .groupBy(devices.platform),

    db
      .select({
        country: devices.country,
        count: count(),
      })
      .from(devices)
      .where(eq(devices.appId, appId))
      .groupBy(devices.country),

    db
      .select({
        city: devices.city,
        country: devices.country,
        count: count(),
      })
      .from(devices)
      .where(eq(devices.appId, appId))
      .groupBy(devices.city, devices.country),
  ]);

  const totalDevicesNum = Number(totalDevices);
  const totalDevicesYesterdayNum = Number(totalDevicesYesterday);
  const activeDevices24hNum = Number(activeDevices24h);
  const activeDevicesYesterdayNum = Number(activeDevicesYesterday);

  const totalDevicesYesterdayForCalc = Math.max(totalDevicesYesterdayNum, 1);
  const totalDevicesChange24h =
    ((totalDevicesNum - totalDevicesYesterdayNum) /
      totalDevicesYesterdayForCalc) *
    100;

  const activeDevicesYesterdayForCalc = Math.max(activeDevicesYesterdayNum, 1);
  const activeDevicesChange24h =
    ((activeDevices24hNum - activeDevicesYesterdayNum) /
      activeDevicesYesterdayForCalc) *
    100;

  const platformStats: Record<string, number> = {
    ios: 0,
    android: 0,
    unknown: 0,
  };
  for (const row of platformStatsResult) {
    const normalizedPlatform = normalizePlatform(row.platform);
    if (normalizedPlatform) {
      platformStats[normalizedPlatform] = Number(row.count);
    }
  }

  const countryStats: Record<string, number> = {};
  for (const row of countryStatsResult) {
    if (row.country !== null) {
      countryStats[row.country] = Number(row.count);
    }
  }

  const cityStats: Record<string, { count: number; country: string }> = {};
  for (const row of cityStatsResult) {
    if (row.city !== null) {
      cityStats[row.city] = {
        count: Number(row.count),
        country: row.country || '',
      };
    }
  }

  return {
    totalDevices: totalDevicesNum,
    activeDevices24h: activeDevices24hNum,
    platformStats,
    countryStats,
    cityStats,
    totalDevicesChange24h: Number(totalDevicesChange24h.toFixed(2)),
    activeDevicesChange24h: Number(activeDevicesChange24h.toFixed(2)),
  };
}

export async function getPublicDeviceTimeseries(options: {
  appId: string;
  startDate?: string;
  endDate?: string;
  metric: PublicApiDeviceTimeseriesMetric;
}) {
  const now = new Date();
  const defaultStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const start = options.startDate ? new Date(options.startDate) : defaultStart;
  const end = options.endDate ? new Date(options.endDate) : now;

  if (options.metric === 'activeDevices') {
    const result = await db.execute<{
      date: string;
      activeDevices: number;
    }>(sql`
      WITH date_series AS (
        SELECT DATE(generate_series(
          ${start}::timestamp,
          ${end}::timestamp,
          '1 day'::interval
        )) as date
      )
      SELECT
        ds.date::text,
        COALESCE(COUNT(DISTINCT s.device_id), 0)::int as "activeDevices"
      FROM date_series ds
      LEFT JOIN (
        SELECT s.device_id, s.last_activity_at
        FROM sessions_analytics s
        INNER JOIN devices d ON s.device_id = d.device_id
        WHERE d.app_id = ${options.appId}
      ) s ON DATE(s.last_activity_at) = ds.date
      WHERE ds.date <= CURRENT_DATE
      GROUP BY ds.date
      ORDER BY ds.date
    `);

    return {
      data: result.rows.map((row) => ({
        date: row.date,
        activeDevices: Number(row.activeDevices),
      })),
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    };
  }

  const result = await db.execute<{
    date: string;
    totalDevices: number;
  }>(sql`
    WITH date_series AS (
      SELECT DATE(generate_series(
        ${start}::timestamp,
        ${end}::timestamp,
        '1 day'::interval
      )) as date
    )
    SELECT
      ds.date::text,
      COALESCE(
        (SELECT COUNT(DISTINCT d.device_id)::int
          FROM devices d
          WHERE d.app_id = ${options.appId}
            AND DATE(d.first_seen) <= ds.date),
        0
      ) as "totalDevices"
    FROM date_series ds
    WHERE ds.date <= CURRENT_DATE
    ORDER BY ds.date
  `);

  return {
    data: result.rows.map((row) => ({
      date: row.date,
      totalDevices: Number(row.totalDevices),
    })),
    period: {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
  };
}

export async function getPublicDeviceBreakdown(options: {
  appId: string;
  dimension: PublicApiDeviceBreakdownDimension;
  limit?: number;
}) {
  const limit = Math.max(
    1,
    Math.min(
      Math.floor(options.limit ?? PUBLIC_API_DEFAULT_BREAKDOWN_LIMIT),
      PUBLIC_API_MAX_BREAKDOWN_LIMIT
    )
  );

  if (options.dimension === 'platform') {
    const rows = await db
      .select({
        value: sql<string>`COALESCE(${devices.platform}, 'unknown')`,
        count: count(),
      })
      .from(devices)
      .where(eq(devices.appId, options.appId))
      .groupBy(devices.platform)
      .orderBy(sql`count DESC`)
      .limit(limit);

    return rows.map((row) => ({
      value: normalizePlatform(row.value) || 'unknown',
      count: Number(row.count),
    }));
  }

  if (options.dimension === 'country') {
    const rows = await db
      .select({
        value: sql<string>`COALESCE(${devices.country}, 'unknown')`,
        count: count(),
      })
      .from(devices)
      .where(eq(devices.appId, options.appId))
      .groupBy(devices.country)
      .orderBy(sql`count DESC`)
      .limit(limit);

    return rows.map((row) => ({
      value: row.value,
      count: Number(row.count),
    }));
  }

  const rows = await db
    .select({
      value: sql<string>`COALESCE(${devices.city}, 'unknown')`,
      country: sql<string>`COALESCE(${devices.country}, '')`,
      count: count(),
    })
    .from(devices)
    .where(eq(devices.appId, options.appId))
    .groupBy(devices.city, devices.country)
    .orderBy(sql`count DESC`)
    .limit(limit);

  return rows.map((row) => ({
    value: row.value,
    count: Number(row.count),
    country: row.country,
  }));
}
