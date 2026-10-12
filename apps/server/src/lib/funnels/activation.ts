import {
  FUNNEL_ACTIVATION_WINDOW_HOURS,
  FUNNEL_ENGAGED_TOTAL_SESSION_SECONDS,
  type FunnelResult,
} from '@phase/shared';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { utcTimestamp } from '@/lib/reports/sql';
import { SESSION_MIN_DURATION_SECONDS } from '@/lib/validators';
import { buildStepResults, type FunnelPeriod, toFunnelResult } from './results';

type ActivationRow = {
  first_open: number;
  engaged_10m: number;
  d1_return: number;
  d3_return: number;
};

export async function runActivationFunnel(
  appId: string,
  period: FunnelPeriod
): Promise<FunnelResult> {
  const { start, end } = period;
  const windowHours = FUNNEL_ACTIVATION_WINDOW_HOURS;
  const engagedSeconds = FUNNEL_ENGAGED_TOTAL_SESSION_SECONDS;

  const result = await db.execute<ActivationRow>(sql`
    WITH cohorts AS (
      SELECT device_id, first_seen
      FROM devices
      WHERE app_id = ${appId}
        AND first_seen >= ${utcTimestamp(start)}
        AND first_seen <= ${utcTimestamp(end)}
    ),
    session_stats AS (
      SELECT
        c.device_id,
        c.first_seen,
        COALESCE(
          SUM(
            EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at))
          ) FILTER (
            WHERE s.session_id IS NOT NULL
              AND EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at))
                >= ${SESSION_MIN_DURATION_SECONDS}
          ),
          0
        ) AS total_session_seconds
      FROM cohorts c
      LEFT JOIN sessions_analytics s
        ON s.device_id = c.device_id
        AND s.started_at >= c.first_seen
        AND s.started_at < c.first_seen + (${windowHours} * INTERVAL '1 hour')
      GROUP BY c.device_id, c.first_seen
    )
    SELECT
      COUNT(*)::int AS first_open,
      COUNT(*) FILTER (
        WHERE total_session_seconds >= ${engagedSeconds}
      )::int AS engaged_10m,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM sessions_analytics s1
          WHERE s1.device_id = ss.device_id
            AND s1.started_at >= ss.first_seen + INTERVAL '1 day'
            AND s1.started_at < ss.first_seen + INTERVAL '2 day'
            AND EXTRACT(EPOCH FROM (s1.last_activity_at - s1.started_at))
              >= ${SESSION_MIN_DURATION_SECONDS}
        )
      )::int AS d1_return,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM sessions_analytics s3
          WHERE s3.device_id = ss.device_id
            AND s3.started_at >= ss.first_seen + INTERVAL '3 day'
            AND s3.started_at < ss.first_seen + INTERVAL '4 day'
            AND EXTRACT(EPOCH FROM (s3.last_activity_at - s3.started_at))
              >= ${SESSION_MIN_DURATION_SECONDS}
        )
      )::int AS d3_return
    FROM session_stats ss
  `);

  const row = result.rows[0] ?? {
    first_open: 0,
    engaged_10m: 0,
    d1_return: 0,
    d3_return: 0,
  };

  const steps = buildStepResults(
    [
      { key: 'first_open', label: 'First open' },
      { key: 'engaged_10m', label: 'Total session ≥10m' },
      { key: 'd1_return', label: 'Returned on day 1' },
      { key: 'd3_return', label: 'Returned on day 3' },
    ],
    [
      Number(row.first_open),
      Number(row.engaged_10m),
      Number(row.d1_return),
      Number(row.d3_return),
    ]
  );

  return toFunnelResult(steps, period);
}
