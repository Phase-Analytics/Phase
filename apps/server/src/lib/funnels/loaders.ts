import { sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  buildExploreEventsSubquery,
  executeQuestDBReadQuery,
} from '@/lib/questdb';
import { assertExploreEventName, escapeQuestDbString } from '@/lib/questdb-sql';
import { utcTimestamp } from '@/lib/reports/sql';
import { SESSION_MIN_DURATION_SECONDS } from '@/lib/validators';
import type { FunnelPeriod } from './results';

/** Rows one funnel input may load into memory before the run is refused. */
export const FUNNEL_MAX_ROWS = 500_000;

export class FunnelTooLargeError extends Error {
  constructor(source: string) {
    super(
      `Funnel matches more than ${FUNNEL_MAX_ROWS.toLocaleString('en-US')} ${source}; narrow the date range`
    );
    this.name = 'FunnelTooLargeError';
  }
}

function assertWithinCap(rows: unknown[], source: string): void {
  if (rows.length > FUNNEL_MAX_ROWS) {
    throw new FunnelTooLargeError(source);
  }
}

export type SessionRecord = {
  startedAt: number;
  durationSeconds: number;
};

// Epoch milliseconds computed in SQL: timestamp columns hold UTC wall time
// and would be misread as local time if parsed as strings.
const epochMs = (column: string) =>
  sql.raw(`floor(EXTRACT(EPOCH FROM ${column}) * 1000)::float8`);

export async function loadFirstSeenMap(
  appId: string,
  period: FunnelPeriod
): Promise<Map<string, number>> {
  const result = await db.execute<{ device_id: string; first_seen_ms: number }>(
    sql`
      SELECT device_id, ${epochMs('first_seen')} AS first_seen_ms
      FROM devices
      WHERE app_id = ${appId}
        AND first_seen >= ${utcTimestamp(period.start)}
        AND first_seen <= ${utcTimestamp(period.end)}
      LIMIT ${FUNNEL_MAX_ROWS + 1}
    `
  );
  assertWithinCap(result.rows, 'new devices');
  return new Map(
    result.rows.map((row) => [row.device_id, Number(row.first_seen_ms)])
  );
}

/** Measurable sessions started in [rangeStart, rangeEnd], oldest first. */
export async function loadSessions(
  appId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<Map<string, SessionRecord[]>> {
  const result = await db.execute<{
    device_id: string;
    started_at_ms: number;
    duration_seconds: number;
  }>(sql`
    SELECT
      s.device_id,
      ${epochMs('s.started_at')} AS started_at_ms,
      EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at))::float AS duration_seconds
    FROM sessions_analytics s
    INNER JOIN devices d ON d.device_id = s.device_id
    WHERE d.app_id = ${appId}
      AND s.started_at >= ${utcTimestamp(rangeStart)}
      AND s.started_at <= ${utcTimestamp(rangeEnd)}
      AND EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at))
        >= ${SESSION_MIN_DURATION_SECONDS}
    ORDER BY s.started_at ASC
    LIMIT ${FUNNEL_MAX_ROWS + 1}
  `);
  assertWithinCap(result.rows, 'sessions');

  const map = new Map<string, SessionRecord[]>();
  for (const row of result.rows) {
    const list = map.get(row.device_id) ?? [];
    list.push({
      startedAt: Number(row.started_at_ms),
      durationSeconds: Number(row.duration_seconds),
    });
    map.set(row.device_id, list);
  }
  return map;
}

type EventStepRow = {
  device_id: string;
  step_ts: string;
};

type EventStepsQuery = {
  appId: string;
  eventName: string;
  rangeStart: Date;
  rangeEnd: Date;
};

function eventStepsSubquery(
  query: EventStepsQuery,
  selectClause: string
): string {
  assertExploreEventName(query.eventName);
  return buildExploreEventsSubquery({
    selectClause,
    conditions: [
      `app_id = '${escapeQuestDbString(query.appId)}'`,
      `name = '${escapeQuestDbString(query.eventName)}'`,
      'is_screen = false',
    ],
    startDate: query.rangeStart.toISOString(),
    endDate: query.rangeEnd.toISOString(),
  });
}

function groupEventTimes(rows: EventStepRow[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (const row of rows) {
    const list = map.get(row.device_id) ?? [];
    list.push(new Date(row.step_ts).getTime());
    map.set(row.device_id, list);
  }
  return map;
}

/** Every occurrence of a custom event per device, oldest first. */
export async function loadEventTimes(
  appId: string,
  eventName: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<Map<string, number[]>> {
  const rows = await executeQuestDBReadQuery<EventStepRow>(`
    SELECT CAST(device_id AS VARCHAR) AS device_id, step_ts
    FROM (${eventStepsSubquery(
      { appId, eventName, rangeStart, rangeEnd },
      'device_id, timestamp AS step_ts'
    )}) event_rows
    ORDER BY step_ts ASC
    LIMIT ${FUNNEL_MAX_ROWS + 1}
  `);
  assertWithinCap(rows, `"${eventName}" events`);
  return groupEventTimes(rows);
}

/** Only the earliest occurrence per device, aggregated inside QuestDB. */
export async function loadFirstEventTimes(
  appId: string,
  eventName: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<Map<string, number[]>> {
  const rows = await executeQuestDBReadQuery<EventStepRow>(`
    SELECT CAST(device_id AS VARCHAR) AS device_id, min(step_ts) AS step_ts
    FROM (${eventStepsSubquery(
      { appId, eventName, rangeStart, rangeEnd },
      'device_id, min(timestamp) AS step_ts'
    )}) first_events
    GROUP BY device_id
    LIMIT ${FUNNEL_MAX_ROWS + 1}
  `);
  assertWithinCap(rows, `devices with "${eventName}" events`);
  return groupEventTimes(rows);
}
