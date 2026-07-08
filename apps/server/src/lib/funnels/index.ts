import {
  FUNNEL_ACTIVATION_WINDOW_HOURS,
  FUNNEL_ENGAGED_TOTAL_SESSION_SECONDS,
  type FunnelCustomStep,
  type FunnelResult,
  type FunnelStepResult,
  funnelStepLabel,
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
        AND first_seen >= ${start}::timestamp
        AND first_seen <= ${end}::timestamp
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

type DeviceFirstSeenRow = {
  device_id: string;
  first_seen: Date | string;
};

type DeviceSessionRow = {
  device_id: string;
  started_at: Date | string;
};

type EventStepRow = {
  device_id: string;
  step_ts: string;
};

function toMs(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function eventCondition(name: string): string {
  assertExploreEventName(name);
  return `(name = '${escapeQuestDbString(name)}' AND is_screen = false)`;
}

async function loadFirstSeenMap(
  appId: string,
  period: FunnelPeriod
): Promise<Map<string, number>> {
  const result = await db.execute<DeviceFirstSeenRow>(sql`
    SELECT device_id, first_seen
    FROM devices
    WHERE app_id = ${appId}
      AND first_seen >= ${period.start}::timestamp
      AND first_seen <= ${period.end}::timestamp
  `);
  const map = new Map<string, number>();
  for (const row of result.rows) {
    map.set(row.device_id, toMs(row.first_seen));
  }
  return map;
}

async function loadSessionTimes(
  appId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<Map<string, number[]>> {
  const result = await db.execute<DeviceSessionRow>(sql`
    SELECT s.device_id, s.started_at
    FROM sessions_analytics s
    INNER JOIN devices d ON d.device_id = s.device_id
    WHERE d.app_id = ${appId}
      AND s.started_at >= ${rangeStart}::timestamp
      AND s.started_at <= ${rangeEnd}::timestamp
      AND EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at))
        >= ${SESSION_MIN_DURATION_SECONDS}
    ORDER BY s.started_at ASC
  `);
  const map = new Map<string, number[]>();
  for (const row of result.rows) {
    const list = map.get(row.device_id) ?? [];
    list.push(toMs(row.started_at));
    map.set(row.device_id, list);
  }
  return map;
}

async function loadEventTimes(
  appId: string,
  eventName: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<Map<string, number[]>> {
  const eventsSubquery = buildExploreEventsSubquery({
    selectClause:
      'CAST(device_id AS VARCHAR) AS device_id, timestamp AS step_ts',
    conditions: [
      `app_id = '${escapeQuestDbString(appId)}'`,
      eventCondition(eventName),
    ],
    startDate: rangeStart.toISOString(),
    endDate: rangeEnd.toISOString(),
  });

  const rows = await executeQuestDBReadQuery<EventStepRow>(`
    SELECT device_id, step_ts
    FROM (${eventsSubquery}) event_rows
    ORDER BY step_ts ASC
  `);

  const map = new Map<string, number[]>();
  for (const row of rows) {
    const list = map.get(row.device_id) ?? [];
    list.push(toMs(row.step_ts));
    map.set(row.device_id, list);
  }
  return map;
}

function firstTimestampAfter(
  times: number[] | undefined,
  afterMs: number,
  windowEndMs: number
): number | null {
  if (!times) {
    return null;
  }
  for (const time of times) {
    if (time > afterMs && time <= windowEndMs) {
      return time;
    }
  }
  return null;
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

  const windowMs = windowHours * 60 * 60 * 1000;
  const rangeEnd = new Date(period.end.getTime() + windowMs);

  const needsFirstSeen = steps.some((step) => step.kind === 'first_seen');
  const needsSession = steps.some((step) => step.kind === 'session');
  const eventNames = [
    ...new Set(
      steps
        .filter((step) => step.kind === 'event')
        .map((step) => step.name?.trim())
        .filter((name): name is string => Boolean(name))
    ),
  ];

  const [firstSeenMap, sessionMap, ...eventMaps] = await Promise.all([
    needsFirstSeen
      ? loadFirstSeenMap(appId, period)
      : Promise.resolve(new Map<string, number>()),
    needsSession
      ? loadSessionTimes(appId, period.start, rangeEnd)
      : Promise.resolve(new Map<string, number[]>()),
    ...eventNames.map((name) =>
      loadEventTimes(appId, name, period.start, rangeEnd)
    ),
  ]);

  const eventTimeMaps = new Map(
    eventNames.map((name, index) => [name, eventMaps[index] ?? new Map()])
  );

  let cohortDevices: string[];
  if (steps[0]?.kind === 'first_seen') {
    cohortDevices = [...firstSeenMap.keys()];
  } else if (steps[0]?.kind === 'session') {
    const inPeriod = await loadSessionTimes(appId, period.start, period.end);
    for (const [deviceId, times] of inPeriod) {
      const existing = sessionMap.get(deviceId) ?? [];
      sessionMap.set(
        deviceId,
        [...new Set([...existing, ...times])].toSorted((a, b) => a - b)
      );
    }
    cohortDevices = [...inPeriod.keys()];
  } else {
    const firstEvent = steps[0]?.name?.trim();
    if (!firstEvent) {
      throw new Error('First step event name is required');
    }
    const inPeriod = await loadEventTimes(
      appId,
      firstEvent,
      period.start,
      period.end
    );
    const existing = eventTimeMaps.get(firstEvent) ?? new Map();
    for (const [deviceId, times] of inPeriod) {
      const merged = existing.get(deviceId) ?? [];
      existing.set(
        deviceId,
        [...new Set([...merged, ...times])].toSorted((a, b) => a - b)
      );
    }
    eventTimeMaps.set(firstEvent, existing);
    cohortDevices = [...inPeriod.keys()];
  }

  const reached = steps.map(() => 0);

  for (const deviceId of cohortDevices) {
    let previousTs: number | null = null;

    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      let nextTs: number | null = null;

      if (index === 0) {
        if (step.kind === 'first_seen') {
          nextTs = firstSeenMap.get(deviceId) ?? null;
        } else if (step.kind === 'session') {
          nextTs = sessionMap.get(deviceId)?.[0] ?? null;
        } else {
          const name = step.name?.trim() ?? '';
          nextTs = eventTimeMaps.get(name)?.get(deviceId)?.[0] ?? null;
        }
      } else if (previousTs !== null) {
        const afterMs: number = previousTs;
        const windowEndMs: number = afterMs + windowMs;
        if (step.kind === 'first_seen') {
          const ts = firstSeenMap.get(deviceId);
          nextTs =
            ts !== undefined && ts > afterMs && ts <= windowEndMs ? ts : null;
        } else if (step.kind === 'session') {
          nextTs = firstTimestampAfter(
            sessionMap.get(deviceId),
            afterMs,
            windowEndMs
          );
        } else {
          const name = step.name?.trim() ?? '';
          nextTs = firstTimestampAfter(
            eventTimeMaps.get(name)?.get(deviceId),
            afterMs,
            windowEndMs
          );
        }
      }

      if (nextTs === null) {
        break;
      }

      reached[index] = (reached[index] ?? 0) + 1;
      previousTs = nextTs;
    }
  }

  const stepResults = buildStepResults(
    steps.map((step, index) => ({
      key: `step_${index}`,
      label: funnelStepLabel(step),
    })),
    reached
  );

  return toFunnelResult(stepResults, period);
}
