import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { cachedRead, READ_CACHE_TTL } from '@/lib/read-cache';
import { type DayRange, dayRangeCacheParams } from '@/lib/reports/day-range';
import { localDay, sessionDuration, utcTimestamp } from '@/lib/reports/sql';
import {
  SESSION_BOUNCE_DURATION_SECONDS,
  SESSION_MIN_DURATION_SECONDS,
} from '@/lib/validators';

const HOUR_MS = 60 * 60 * 1000;

export type SessionOverview = {
  totalSessions: number;
  averageSessionDuration: number | null;
  activeSessions24h: number;
  totalSessionsChange24h: number;
  activeSessions24hChange: number;
  bounceRate: number;
};

type SessionOverviewRow = {
  total: string;
  started_since_24h: string;
  active_24h: string;
  active_yesterday: string;
  avg_duration: number | null;
  bounced: string;
};

/** Measurable-session KPIs for an app in a single scan. */
export function getSessionOverview(appId: string): Promise<SessionOverview> {
  return cachedRead(
    {
      appId,
      scope: 'sessions:overview',
      params: {},
      ttlSeconds: READ_CACHE_TTL.short,
    },
    () => querySessionOverview(appId, new Date())
  );
}

async function querySessionOverview(
  appId: string,
  now: Date
): Promise<SessionOverview> {
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * HOUR_MS);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * HOUR_MS);
  const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

  const result = await db.execute<SessionOverviewRow>(sql`
    SELECT
      count(*) AS total,
      count(*) FILTER (
        WHERE s.started_at >= ${utcTimestamp(twentyFourHoursAgo)}
      ) AS started_since_24h,
      count(*) FILTER (
        WHERE s.started_at >= ${utcTimestamp(twentyFourHoursAgo)}
          AND s.started_at <= ${utcTimestamp(now)}
      ) AS active_24h,
      count(*) FILTER (
        WHERE s.started_at >= ${utcTimestamp(fortyEightHoursAgo)}
          AND s.started_at < ${utcTimestamp(twentyFourHoursAgo)}
      ) AS active_yesterday,
      avg(${sessionDuration}) FILTER (
        WHERE s.started_at < ${utcTimestamp(thirtySecondsAgo)}
      )::float8 AS avg_duration,
      count(*) FILTER (
        WHERE ${sessionDuration} < ${SESSION_BOUNCE_DURATION_SECONDS}
      ) AS bounced
    FROM sessions_analytics s
    WHERE s.device_id IN (SELECT device_id FROM devices WHERE app_id = ${appId})
      AND ${sessionDuration} >= ${SESSION_MIN_DURATION_SECONDS}
  `);

  const row = result.rows[0];
  const totalSessions = Number(row?.total ?? 0);
  const activeSessions24h = Number(row?.active_24h ?? 0);
  const bouncedSessions = Number(row?.bounced ?? 0);

  return {
    totalSessions,
    averageSessionDuration:
      row?.avg_duration === null || row?.avg_duration === undefined
        ? null
        : Number(row.avg_duration),
    activeSessions24h,
    // total minus sessions started before 24h ago
    totalSessionsChange24h: Number(row?.started_since_24h ?? 0),
    activeSessions24hChange:
      activeSessions24h - Number(row?.active_yesterday ?? 0),
    bounceRate:
      totalSessions > 0
        ? Number(((bouncedSessions / totalSessions) * 100).toFixed(2))
        : 0,
  };
}

export type SessionDailyPoint = {
  date: string;
  sessions: number;
  bounceRate: number;
  avgDuration: number;
};

type SessionDailyRow = {
  day: string;
  sessions: string;
  bounced: string;
  avg_duration: number | null;
};

/**
 * Measurable sessions bucketed by the local day they started. Returns every
 * day in the range (zero-filled) with all session metrics at once, so callers
 * pick the metric they expose.
 */
export function getSessionDailySeries(
  appId: string,
  range: DayRange
): Promise<SessionDailyPoint[]> {
  return cachedRead(
    {
      appId,
      scope: 'sessions:daily',
      params: dayRangeCacheParams(range),
      ttlSeconds: READ_CACHE_TTL.standard,
    },
    () => querySessionDailySeries(appId, range)
  );
}

async function querySessionDailySeries(
  appId: string,
  range: DayRange
): Promise<SessionDailyPoint[]> {
  const result = await db.execute<SessionDailyRow>(sql`
    SELECT
      ${localDay(sql`s.started_at`, range.timeZone)} AS day,
      count(*) AS sessions,
      count(*) FILTER (
        WHERE ${sessionDuration} < ${SESSION_BOUNCE_DURATION_SECONDS}
      ) AS bounced,
      avg(${sessionDuration})::float8 AS avg_duration
    FROM sessions_analytics s
    INNER JOIN devices d ON s.device_id = d.device_id
    WHERE d.app_id = ${appId}
      AND s.started_at >= ${utcTimestamp(range.scanStart)}
      AND s.started_at < ${utcTimestamp(range.scanEnd)}
      AND ${sessionDuration} >= ${SESSION_MIN_DURATION_SECONDS}
    GROUP BY 1
  `);

  const byDay = new Map(result.rows.map((row) => [row.day, row]));
  return range.days.map((date) => {
    const row = byDay.get(date);
    const sessions = Number(row?.sessions ?? 0);
    const bounced = Number(row?.bounced ?? 0);
    return {
      date,
      sessions,
      bounceRate:
        sessions > 0 ? Number(((bounced / sessions) * 100).toFixed(2)) : 0,
      avgDuration: Number(row?.avg_duration ?? 0),
    };
  });
}
