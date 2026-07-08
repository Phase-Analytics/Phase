import {
  FUNNEL_ACTIVATION_WINDOW_HOURS,
  FUNNEL_ENGAGED_TOTAL_SESSION_SECONDS,
  type FunnelCustomStep,
  type FunnelResult,
  type FunnelStepKind,
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
const SESSION_30S = 30;
const SESSION_10M = 10 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;

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
  duration_seconds: number;
};

type EventStepRow = {
  device_id: string;
  step_ts: string;
};

type SessionRecord = {
  startedAt: number;
  durationSeconds: number;
};

function toMs(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function startOfUtcDay(ms: number): number {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
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

async function loadSessions(
  appId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<Map<string, SessionRecord[]>> {
  const result = await db.execute<DeviceSessionRow>(sql`
    SELECT
      s.device_id,
      s.started_at,
      EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at))::float AS duration_seconds
    FROM sessions_analytics s
    INNER JOIN devices d ON d.device_id = s.device_id
    WHERE d.app_id = ${appId}
      AND s.started_at >= ${rangeStart}::timestamp
      AND s.started_at <= ${rangeEnd}::timestamp
      AND EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at))
        >= ${SESSION_MIN_DURATION_SECONDS}
    ORDER BY s.started_at ASC
  `);
  const map = new Map<string, SessionRecord[]>();
  for (const row of result.rows) {
    const list = map.get(row.device_id) ?? [];
    list.push({
      startedAt: toMs(row.started_at),
      durationSeconds: Number(row.duration_seconds),
    });
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

function firstSessionAfter(
  sessions: SessionRecord[] | undefined,
  afterMs: number,
  windowEndMs: number,
  minDuration: number
): number | null {
  if (!sessions) {
    return null;
  }
  for (const session of sessions) {
    if (
      session.startedAt > afterMs &&
      session.startedAt <= windowEndMs &&
      session.durationSeconds >= minDuration
    ) {
      return session.startedAt;
    }
  }
  return null;
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

function engagedThresholdAt(
  sessions: SessionRecord[] | undefined,
  afterMs: number,
  windowEndMs: number,
  thresholdSeconds: number
): number | null {
  if (!sessions) {
    return null;
  }
  let total = 0;
  for (const session of sessions) {
    if (session.startedAt <= afterMs || session.startedAt > windowEndMs) {
      continue;
    }
    total += session.durationSeconds;
    if (total >= thresholdSeconds) {
      return session.startedAt + session.durationSeconds * 1000;
    }
  }
  return null;
}

function returnOnDay(
  sessions: SessionRecord[] | undefined,
  previousTs: number,
  dayOffset: number,
  windowEndMs: number
): number | null {
  if (!sessions) {
    return null;
  }
  const dayStart = startOfUtcDay(previousTs) + dayOffset * DAY_MS;
  const dayEnd = dayStart + DAY_MS;
  for (const session of sessions) {
    if (
      session.startedAt >= dayStart &&
      session.startedAt < dayEnd &&
      session.startedAt > previousTs &&
      session.startedAt <= windowEndMs
    ) {
      return session.startedAt;
    }
  }
  return null;
}

function resolveStepTimestamp(options: {
  kind: FunnelStepKind;
  eventName?: string;
  deviceId: string;
  previousTs: number | null;
  windowEndMs: number;
  firstSeenMap: Map<string, number>;
  sessionMap: Map<string, SessionRecord[]>;
  eventTimeMaps: Map<string, Map<string, number[]>>;
}): number | null {
  const {
    kind,
    eventName,
    deviceId,
    previousTs,
    windowEndMs,
    firstSeenMap,
    sessionMap,
    eventTimeMaps,
  } = options;

  if (previousTs === null) {
    if (kind === 'first_seen') {
      return firstSeenMap.get(deviceId) ?? null;
    }
    if (kind === 'session') {
      return firstSessionAfter(
        sessionMap.get(deviceId),
        Number.NEGATIVE_INFINITY,
        windowEndMs,
        SESSION_MIN_DURATION_SECONDS
      );
    }
    if (kind === 'session_30s') {
      return firstSessionAfter(
        sessionMap.get(deviceId),
        Number.NEGATIVE_INFINITY,
        windowEndMs,
        SESSION_30S
      );
    }
    if (kind === 'session_10m') {
      return firstSessionAfter(
        sessionMap.get(deviceId),
        Number.NEGATIVE_INFINITY,
        windowEndMs,
        SESSION_10M
      );
    }
    if (kind === 'engaged_10m') {
      return engagedThresholdAt(
        sessionMap.get(deviceId),
        Number.NEGATIVE_INFINITY,
        windowEndMs,
        FUNNEL_ENGAGED_TOTAL_SESSION_SECONDS
      );
    }
    if (kind === 'return_d1' || kind === 'return_d3') {
      return null;
    }
    return eventTimeMaps.get(eventName ?? '')?.get(deviceId)?.[0] ?? null;
  }

  if (kind === 'first_seen') {
    const ts = firstSeenMap.get(deviceId);
    return ts !== undefined && ts > previousTs && ts <= windowEndMs ? ts : null;
  }
  if (kind === 'session') {
    return firstSessionAfter(
      sessionMap.get(deviceId),
      previousTs,
      windowEndMs,
      SESSION_MIN_DURATION_SECONDS
    );
  }
  if (kind === 'session_30s') {
    return firstSessionAfter(
      sessionMap.get(deviceId),
      previousTs,
      windowEndMs,
      SESSION_30S
    );
  }
  if (kind === 'session_10m') {
    return firstSessionAfter(
      sessionMap.get(deviceId),
      previousTs,
      windowEndMs,
      SESSION_10M
    );
  }
  if (kind === 'engaged_10m') {
    return engagedThresholdAt(
      sessionMap.get(deviceId),
      previousTs,
      windowEndMs,
      FUNNEL_ENGAGED_TOTAL_SESSION_SECONDS
    );
  }
  if (kind === 'return_d1') {
    return returnOnDay(sessionMap.get(deviceId), previousTs, 1, windowEndMs);
  }
  if (kind === 'return_d3') {
    return returnOnDay(sessionMap.get(deviceId), previousTs, 3, windowEndMs);
  }
  return firstTimestampAfter(
    eventTimeMaps.get(eventName ?? '')?.get(deviceId),
    previousTs,
    windowEndMs
  );
}

function needsSessions(steps: FunnelCustomStep[]): boolean {
  return steps.some((step) =>
    [
      'session',
      'session_30s',
      'session_10m',
      'engaged_10m',
      'return_d1',
      'return_d3',
    ].includes(step.kind)
  );
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
    needsSessions(steps)
      ? loadSessions(appId, period.start, rangeEnd)
      : Promise.resolve(new Map<string, SessionRecord[]>()),
    ...eventNames.map((name) =>
      loadEventTimes(appId, name, period.start, rangeEnd)
    ),
  ]);

  const eventTimeMaps = new Map(
    eventNames.map((name, index) => [name, eventMaps[index] ?? new Map()])
  );

  let cohortDevices: string[];
  const first = steps[0];
  if (!first) {
    throw new Error('Custom funnel requires at least 2 steps');
  }

  if (first.kind === 'first_seen') {
    cohortDevices = [...firstSeenMap.keys()];
  } else if (first.kind === 'event') {
    const firstEvent = first.name?.trim();
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
  } else {
    const inPeriod = await loadSessions(appId, period.start, period.end);
    for (const [deviceId, sessions] of inPeriod) {
      const existing = sessionMap.get(deviceId) ?? [];
      const merged = [...existing];
      for (const session of sessions) {
        if (!merged.some((item) => item.startedAt === session.startedAt)) {
          merged.push(session);
        }
      }
      sessionMap.set(
        deviceId,
        merged.toSorted((a, b) => a.startedAt - b.startedAt)
      );
    }
    cohortDevices = [...inPeriod.keys()].filter((deviceId) => {
      const ts = resolveStepTimestamp({
        kind: first.kind,
        eventName: first.name,
        deviceId,
        previousTs: null,
        windowEndMs: period.end.getTime(),
        firstSeenMap,
        sessionMap,
        eventTimeMaps,
      });
      return (
        ts !== null &&
        ts >= period.start.getTime() &&
        ts <= period.end.getTime()
      );
    });
  }

  const reached = steps.map(() => 0);

  for (const deviceId of cohortDevices) {
    let previousTs: number | null = null;

    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      const windowEndMs =
        index === 0 || previousTs === null
          ? period.end.getTime()
          : previousTs + windowMs;

      const nextTs = resolveStepTimestamp({
        kind: step.kind,
        eventName: step.name?.trim(),
        deviceId,
        previousTs,
        windowEndMs,
        firstSeenMap,
        sessionMap,
        eventTimeMaps,
      });

      if (nextTs === null) {
        break;
      }

      if (
        index === 0 &&
        (nextTs < period.start.getTime() || nextTs > period.end.getTime())
      ) {
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
