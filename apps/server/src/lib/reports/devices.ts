import type { Platform } from '@phase/shared';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { cachedRead, READ_CACHE_TTL } from '@/lib/read-cache';
import { type DayRange, dayRangeCacheParams } from '@/lib/reports/day-range';
import { localDay, sessionDuration, utcTimestamp } from '@/lib/reports/sql';
import { SESSION_MIN_DURATION_SECONDS } from '@/lib/validators';

const HOUR_MS = 60 * 60 * 1000;

export function normalizePlatform(
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

export type DeviceCounts = {
  total: number;
  /** Devices first seen in the last 24h (no upper bound). */
  firstSeenSince24h: number;
  new24h: number;
  newYesterday: number;
  active24h: number;
  activeYesterday: number;
};

type DeviceTotalsRow = {
  total: string;
  first_seen_since_24h: string;
  new_24h: string;
  new_yesterday: string;
};

type ActiveDevicesRow = { active_24h: string; active_yesterday: string };

/** Device and active-device KPIs: one scan of devices, one of recent sessions. */
export function getDeviceCounts(appId: string): Promise<DeviceCounts> {
  return cachedRead(
    {
      appId,
      scope: 'devices:counts',
      params: {},
      ttlSeconds: READ_CACHE_TTL.short,
    },
    () => queryDeviceCounts(appId, new Date())
  );
}

async function queryDeviceCounts(
  appId: string,
  now: Date
): Promise<DeviceCounts> {
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * HOUR_MS);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * HOUR_MS);

  const [totals, active] = await Promise.all([
    db.execute<DeviceTotalsRow>(sql`
      SELECT
        count(*) AS total,
        count(*) FILTER (
          WHERE first_seen >= ${utcTimestamp(twentyFourHoursAgo)}
        ) AS first_seen_since_24h,
        count(*) FILTER (
          WHERE first_seen >= ${utcTimestamp(twentyFourHoursAgo)}
            AND first_seen <= ${utcTimestamp(now)}
        ) AS new_24h,
        count(*) FILTER (
          WHERE first_seen >= ${utcTimestamp(fortyEightHoursAgo)}
            AND first_seen < ${utcTimestamp(twentyFourHoursAgo)}
        ) AS new_yesterday
      FROM devices
      WHERE app_id = ${appId}
    `),
    db.execute<ActiveDevicesRow>(sql`
      SELECT
        count(DISTINCT device_id) FILTER (
          WHERE last_activity_at >= ${utcTimestamp(twentyFourHoursAgo)}
        ) AS active_24h,
        count(DISTINCT device_id) FILTER (
          WHERE last_activity_at < ${utcTimestamp(twentyFourHoursAgo)}
        ) AS active_yesterday
      FROM sessions_analytics
      WHERE device_id IN (SELECT device_id FROM devices WHERE app_id = ${appId})
        AND last_activity_at >= ${utcTimestamp(fortyEightHoursAgo)}
        AND last_activity_at <= ${utcTimestamp(now)}
    `),
  ]);

  const totalsRow = totals.rows[0];
  const activeRow = active.rows[0];
  return {
    total: Number(totalsRow?.total ?? 0),
    firstSeenSince24h: Number(totalsRow?.first_seen_since_24h ?? 0),
    new24h: Number(totalsRow?.new_24h ?? 0),
    newYesterday: Number(totalsRow?.new_yesterday ?? 0),
    active24h: Number(activeRow?.active_24h ?? 0),
    activeYesterday: Number(activeRow?.active_yesterday ?? 0),
  };
}

export type DeviceBreakdowns = {
  platformStats: Record<string, number>;
  countryStats: Record<string, number>;
  appVersionStats: {
    ios: Record<string, number>;
    android: Record<string, number>;
  };
};

type BreakdownRow = {
  country_set: number;
  version_set: number;
  platform: string;
  country: string | null;
  app_version: string | null;
  count: string;
};

/** Platform, country and per-platform app version counts in one scan. */
export function getDeviceBreakdowns(appId: string): Promise<DeviceBreakdowns> {
  return cachedRead(
    {
      appId,
      scope: 'devices:breakdowns',
      params: {},
      ttlSeconds: READ_CACHE_TTL.standard,
    },
    () => queryDeviceBreakdowns(appId)
  );
}

async function queryDeviceBreakdowns(appId: string): Promise<DeviceBreakdowns> {
  const result = await db.execute<BreakdownRow>(sql`
    SELECT
      1 - GROUPING(country) AS country_set,
      1 - GROUPING(app_version) AS version_set,
      platform,
      country,
      app_version,
      count(*) AS count
    FROM (
      SELECT
        COALESCE(platform, 'unknown') AS platform,
        country,
        TRIM(properties->>'app_version') AS app_version
      FROM devices
      WHERE app_id = ${appId}
    ) d
    GROUP BY GROUPING SETS ((platform), (country), (platform, app_version))
  `);

  const breakdowns: DeviceBreakdowns = {
    platformStats: { ios: 0, android: 0, unknown: 0 },
    countryStats: {},
    appVersionStats: { ios: {}, android: {} },
  };

  for (const row of result.rows) {
    const count = Number(row.count);
    if (Number(row.country_set) === 1) {
      if (row.country !== null) {
        breakdowns.countryStats[row.country] = count;
      }
      continue;
    }

    const platform = normalizePlatform(row.platform);
    if (Number(row.version_set) === 1) {
      const version = row.app_version?.trim();
      if ((platform === 'ios' || platform === 'android') && version) {
        const versions = breakdowns.appVersionStats[platform];
        versions[version] = (versions[version] ?? 0) + count;
      }
      continue;
    }

    if (platform) {
      breakdowns.platformStats[platform] =
        (breakdowns.platformStats[platform] ?? 0) + count;
    }
  }

  return breakdowns;
}

type DailyCountRow = { day: string; count: string };

type DailyCount = { date: string; count: number };

function zeroFill(range: DayRange, rows: DailyCountRow[]): DailyCount[] {
  const byDay = new Map(rows.map((row) => [row.day, Number(row.count)]));
  return range.days.map((date) => ({ date, count: byDay.get(date) ?? 0 }));
}

function cachedDaily(
  scope: string,
  appId: string,
  range: DayRange,
  load: () => Promise<DailyCount[]>
): Promise<DailyCount[]> {
  return cachedRead(
    {
      appId,
      scope,
      params: dayRangeCacheParams(range),
      ttlSeconds: READ_CACHE_TTL.standard,
    },
    load
  );
}

/** Distinct devices with session activity, bucketed by local activity day. */
export function getDailyActiveDevices(appId: string, range: DayRange) {
  return cachedDaily('devices:daily-active', appId, range, () =>
    queryDailyActiveDevices(appId, range)
  );
}

async function queryDailyActiveDevices(appId: string, range: DayRange) {
  const result = await db.execute<DailyCountRow>(sql`
    SELECT
      ${localDay(sql`s.last_activity_at`, range.timeZone)} AS day,
      count(DISTINCT s.device_id) AS count
    FROM sessions_analytics s
    INNER JOIN devices d ON s.device_id = d.device_id
    WHERE d.app_id = ${appId}
      AND s.last_activity_at >= ${utcTimestamp(range.scanStart)}
      AND s.last_activity_at < ${utcTimestamp(range.scanEnd)}
    GROUP BY 1
  `);
  return zeroFill(range, result.rows);
}

async function queryDailyNewDevices(appId: string, range: DayRange) {
  const result = await db.execute<DailyCountRow>(sql`
    SELECT
      ${localDay(sql`first_seen`, range.timeZone)} AS day,
      count(*) AS count
    FROM devices
    WHERE app_id = ${appId}
      AND first_seen >= ${utcTimestamp(range.scanStart)}
      AND first_seen < ${utcTimestamp(range.scanEnd)}
    GROUP BY 1
    ORDER BY 1
  `);
  return result.rows;
}

/** Devices first seen on each local day. */
export function getDailyNewDevices(appId: string, range: DayRange) {
  return cachedDaily('devices:daily-new', appId, range, async () =>
    zeroFill(range, await queryDailyNewDevices(appId, range))
  );
}

/**
 * Cumulative devices first seen on or before each local day: devices before
 * the scan window plus a running sum of daily first-seen counts.
 */
export function getCumulativeDevices(appId: string, range: DayRange) {
  return cachedDaily('devices:daily-total', appId, range, () =>
    queryCumulativeDevices(appId, range)
  );
}

async function queryCumulativeDevices(
  appId: string,
  range: DayRange
): Promise<DailyCount[]> {
  const [baseResult, dailyRows] = await Promise.all([
    db.execute<{ count: string }>(sql`
      SELECT count(*) AS count
      FROM devices
      WHERE app_id = ${appId}
        AND first_seen < ${utcTimestamp(range.scanStart)}
    `),
    queryDailyNewDevices(appId, range),
  ]);

  let running = Number(baseResult.rows[0]?.count ?? 0);
  let rowIndex = 0;
  return range.days.map((date) => {
    while (rowIndex < dailyRows.length && dailyRows[rowIndex].day <= date) {
      running += Number(dailyRows[rowIndex].count);
      rowIndex++;
    }
    return { date, count: running };
  });
}

/** Measurable sessions of one device, bucketed by local start day. */
export async function getDeviceDailySessions(
  deviceId: string,
  range: DayRange
) {
  const result = await db.execute<DailyCountRow>(sql`
    SELECT
      ${localDay(sql`s.started_at`, range.timeZone)} AS day,
      count(*) AS count
    FROM sessions_analytics s
    WHERE s.device_id = ${deviceId}
      AND s.started_at >= ${utcTimestamp(range.scanStart)}
      AND s.started_at < ${utcTimestamp(range.scanEnd)}
      AND ${sessionDuration} >= ${SESSION_MIN_DURATION_SECONDS}
    GROUP BY 1
  `);
  return zeroFill(range, result.rows);
}
