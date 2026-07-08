import {
  FUNNEL_MEANINGFUL_SESSION_SECONDS,
  type FunnelCustomStep,
  type FunnelResult,
  type FunnelStepResult,
} from '@phase/shared';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  buildExploreEventsSubquery,
  executeQuestDBReadQuery,
} from '@/lib/questdb';
import { assertExploreEventName, escapeQuestDbString } from '@/lib/questdb-sql';
import { SESSION_MIN_DURATION_SECONDS } from '@/lib/validators';

const DEFAULT_LOOKBACK_DAYS = 30;

export type FunnelPeriod = {
  start: Date;
  end: Date;
};

export function resolveFunnelPeriod(
  startDate?: string,
  endDate?: string,
  now = new Date()
): FunnelPeriod {
  const end = endDate ? new Date(endDate) : now;
  const start = startDate
    ? new Date(startDate)
    : new Date(end.getTime() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  return { start, end };
}

function roundPct(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return Math.round((numerator * 10_000) / denominator) / 100;
}

function buildStepResults(
  labels: Array<{ key: string; label: string }>,
  counts: number[]
): FunnelStepResult[] {
  const cohortSize = counts[0] ?? 0;
  return labels.map((step, index) => {
    const count = counts[index] ?? 0;
    const previous = index === 0 ? count : (counts[index - 1] ?? 0);
    return {
      key: step.key,
      label: step.label,
      count,
      conversionFromStart: roundPct(count, cohortSize),
      conversionFromPrevious: roundPct(count, previous),
    };
  });
}

function toFunnelResult(
  steps: FunnelStepResult[],
  period: FunnelPeriod
): FunnelResult {
  const cohortSize = steps[0]?.count ?? 0;
  const last = steps.at(-1)?.count ?? 0;
  return {
    steps,
    cohortSize,
    overallConversion: roundPct(last, cohortSize),
    period: {
      startDate: period.start.toISOString(),
      endDate: period.end.toISOString(),
    },
  };
}

type ActivationRow = {
  first_open: number;
  had_session: number;
  meaningful_session: number;
  d1_return: number;
  d7_return: number;
};

export async function runActivationFunnel(
  appId: string,
  period: FunnelPeriod
): Promise<FunnelResult> {
  const { start, end } = period;

  const result = await db.execute<ActivationRow>(sql`
    WITH cohorts AS (
      SELECT device_id, DATE(first_seen) AS cohort_date
      FROM devices
      WHERE app_id = ${appId}
        AND DATE(first_seen) BETWEEN DATE(${start}::timestamp) AND DATE(${end}::timestamp)
    ),
    first_sessions AS (
      SELECT
        c.device_id,
        c.cohort_date,
        MIN(s.started_at) FILTER (
          WHERE EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at))
            >= ${SESSION_MIN_DURATION_SECONDS}
        ) AS first_session_at,
        MIN(s.started_at) FILTER (
          WHERE EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at))
            >= ${FUNNEL_MEANINGFUL_SESSION_SECONDS}
        ) AS first_meaningful_at
      FROM cohorts c
      LEFT JOIN sessions_analytics s ON s.device_id = c.device_id
      GROUP BY c.device_id, c.cohort_date
    )
    SELECT
      COUNT(*)::int AS first_open,
      COUNT(*) FILTER (WHERE first_session_at IS NOT NULL)::int AS had_session,
      COUNT(*) FILTER (WHERE first_meaningful_at IS NOT NULL)::int AS meaningful_session,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM sessions_analytics s2
          WHERE s2.device_id = fs.device_id
            AND s2.started_at >= fs.cohort_date + INTERVAL '1 day'
            AND s2.started_at < fs.cohort_date + INTERVAL '2 day'
            AND EXTRACT(EPOCH FROM (s2.last_activity_at - s2.started_at))
              >= ${SESSION_MIN_DURATION_SECONDS}
        )
      )::int AS d1_return,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM sessions_analytics s7
          WHERE s7.device_id = fs.device_id
            AND s7.started_at >= fs.cohort_date + INTERVAL '7 day'
            AND s7.started_at < fs.cohort_date + INTERVAL '8 day'
            AND EXTRACT(EPOCH FROM (s7.last_activity_at - s7.started_at))
              >= ${SESSION_MIN_DURATION_SECONDS}
        )
      )::int AS d7_return
    FROM first_sessions fs
  `);

  const row = result.rows[0] ?? {
    first_open: 0,
    had_session: 0,
    meaningful_session: 0,
    d1_return: 0,
    d7_return: 0,
  };

  const steps = buildStepResults(
    [
      { key: 'first_open', label: 'First open' },
      { key: 'session', label: 'Started a session' },
      {
        key: 'meaningful_session',
        label: `Meaningful session (≥${FUNNEL_MEANINGFUL_SESSION_SECONDS}s)`,
      },
      { key: 'd1_return', label: 'Returned on day 1' },
      { key: 'd7_return', label: 'Returned on day 7' },
    ],
    [
      Number(row.first_open),
      Number(row.had_session),
      Number(row.meaningful_session),
      Number(row.d1_return),
      Number(row.d7_return),
    ]
  );

  return toFunnelResult(steps, period);
}

type CustomFunnelRow = {
  step_index: number;
  users: number;
};

function stepCondition(step: FunnelCustomStep): string {
  assertExploreEventName(step.name);
  const isScreen = step.kind === 'screen';
  return `(name = '${escapeQuestDbString(step.name)}' AND is_screen = ${isScreen})`;
}

export async function runCustomFunnel(
  appId: string,
  steps: FunnelCustomStep[],
  period: FunnelPeriod,
  windowHours: number
): Promise<FunnelResult> {
  if (steps.length < 2) {
    throw new Error('Custom funnel requires at least 2 steps');
  }

  const startIso = period.start.toISOString();
  const endIso = period.end.toISOString();

  const eventsSubquery = buildExploreEventsSubquery({
    selectClause:
      'CAST(device_id AS VARCHAR) AS device_id, CAST(name AS VARCHAR) AS name, is_screen, timestamp',
    conditions: [`app_id = '${escapeQuestDbString(appId)}'`],
    startDate: startIso,
    endDate: endIso,
  });

  const stepCtes = steps
    .map((step, index) => {
      const alias = `s${index}`;
      const condition = stepCondition(step);
      if (index === 0) {
        return `
          ${alias} AS (
            SELECT device_id, MIN(timestamp) AS step_ts
            FROM events_base
            WHERE ${condition}
            GROUP BY device_id
          )`;
      }
      const prev = `s${index - 1}`;
      return `
          ${alias} AS (
            SELECT e.device_id, MIN(e.timestamp) AS step_ts
            FROM events_base e
            INNER JOIN ${prev} p ON p.device_id = e.device_id
            WHERE ${condition}
              AND e.timestamp > p.step_ts
              AND e.timestamp <= dateadd('h', ${windowHours}, p.step_ts)
            GROUP BY e.device_id
          )`;
    })
    .join(',');

  const unions = steps
    .map(
      (_, index) =>
        `SELECT ${index} AS step_index, COUNT(*) AS users FROM s${index}`
    )
    .join(' UNION ALL ');

  const query = `
    WITH events_base AS (
      ${eventsSubquery}
    ),
    ${stepCtes}
    SELECT step_index, users FROM (
      ${unions}
    )
  `;

  const rows = await executeQuestDBReadQuery<CustomFunnelRow>(query);
  const countByIndex = new Map(
    rows.map((row) => [Number(row.step_index), Number(row.users)])
  );
  const counts = steps.map((_, index) => countByIndex.get(index) ?? 0);

  const stepResults = buildStepResults(
    steps.map((step, index) => ({
      key: `step_${index}`,
      label: step.name,
    })),
    counts
  );

  return toFunnelResult(stepResults, period);
}
