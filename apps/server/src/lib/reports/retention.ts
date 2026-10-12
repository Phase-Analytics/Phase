import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { cachedRead, READ_CACHE_TTL } from '@/lib/read-cache';
import { type DayRange, dayRangeCacheParams } from '@/lib/reports/day-range';
import { sessionDuration, utcTimestamp } from '@/lib/reports/sql';
import { SESSION_MIN_DURATION_SECONDS } from '@/lib/validators';

const MAX_RETENTION_DAY = 30;

export type RetentionPoint = {
  day: number;
  retentionRate: number;
  eligibleUsers: number;
  retainedUsers: number;
};

type RetentionRow = {
  day: number;
  eligibleUsers: number;
  retainedUsers: number;
  retentionRate: number;
};

/**
 * Day-N retention for cohorts keyed by local first-seen day. A device counts
 * as retained on day N when it has a measurable session starting on local day
 * cohort+N. Days that have not fully happened yet (after range.lastDay) are
 * excluded from eligibility.
 */
export function getDeviceRetention(
  appId: string,
  range: DayRange
): Promise<RetentionPoint[]> {
  return cachedRead(
    {
      appId,
      scope: 'devices:retention',
      params: dayRangeCacheParams(range),
      ttlSeconds: READ_CACHE_TTL.standard,
    },
    () => queryDeviceRetention(appId, range)
  );
}

async function queryDeviceRetention(
  appId: string,
  range: DayRange
): Promise<RetentionPoint[]> {
  const { timeZone } = range;
  const localStartedDay = sql`(s.started_at AT TIME ZONE 'UTC' AT TIME ZONE ${timeZone})::date`;
  const retentionDay = sql`(c.cohort_date + ds.day)`;

  const result = await db.execute<RetentionRow>(sql`
    WITH day_series AS (
      SELECT generate_series(0, ${MAX_RETENTION_DAY})::int AS day
    ),
    cohorts AS (
      SELECT
        device_id,
        (first_seen AT TIME ZONE 'UTC' AT TIME ZONE ${timeZone})::date AS cohort_date
      FROM devices
      WHERE app_id = ${appId}
        AND first_seen >= ${utcTimestamp(range.scanStart)}
        AND first_seen < ${utcTimestamp(range.scanEnd)}
        AND (first_seen AT TIME ZONE 'UTC' AT TIME ZONE ${timeZone})::date
          BETWEEN ${range.firstDay}::date AND ${range.lastDay}::date
    )
    SELECT
      ds.day,
      COUNT(DISTINCT c.device_id)::int AS "eligibleUsers",
      CASE WHEN ds.day = 0
        THEN COUNT(DISTINCT c.device_id)::int
        ELSE COUNT(DISTINCT c.device_id) FILTER (WHERE s.session_id IS NOT NULL)::int
      END AS "retainedUsers",
      CASE
        WHEN COUNT(DISTINCT c.device_id) = 0 THEN 0
        WHEN ds.day = 0 THEN 100
        ELSE ROUND(
          COUNT(DISTINCT c.device_id) FILTER (WHERE s.session_id IS NOT NULL)
            * 100.0 / COUNT(DISTINCT c.device_id), 2
        )::float
      END AS "retentionRate"
    FROM day_series ds
    LEFT JOIN cohorts c
      ON ${retentionDay} <= ${range.lastDay}::date
    LEFT JOIN sessions_analytics s
      ON s.device_id = c.device_id
      -- coarse UTC bounds keep the (device_id, started_at) index usable;
      -- the local-day equality below is the exact condition
      AND s.started_at >= ${retentionDay}::timestamp - INTERVAL '1 day'
      AND s.started_at < ${retentionDay}::timestamp + INTERVAL '2 day'
      AND ${localStartedDay} = ${retentionDay}
      AND ${sessionDuration} >= ${SESSION_MIN_DURATION_SECONDS}
    GROUP BY ds.day
    ORDER BY ds.day
  `);

  return result.rows.map((row) => ({
    day: Number(row.day),
    retentionRate: Number(row.retentionRate),
    eligibleUsers: Number(row.eligibleUsers),
    retainedUsers: Number(row.retainedUsers),
  }));
}
