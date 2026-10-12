import {
  appCondition,
  buildEventReadUnion,
  countEventRows,
  dateRangeConditions,
  EVENT_TIMESTAMP_FORMAT,
  escapeSqlString,
  executeQuery,
  sanitizeNumeric,
  timestampLiteral,
  validateIdentifier,
  validateSymbol,
} from './questdb-client';
import { assertExploreEventName } from './questdb-sql';
import { cachedRead, READ_CACHE_TTL } from './read-cache';

export {
  getQuestDBEventStorageDiagnostics,
  initQuestDB,
  type QuestDBEventStorageDiagnostics,
  type QuestDBEventTableDiagnostics,
} from './questdb-schema';

const DAY_MS = 24 * 60 * 60 * 1000;
const ULID_REGEX = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i;
const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Ingest accepts offline timestamps up to 7 days old, so an event can sit that
 * far outside the activity window of its session/device (or the creation time
 * of its ULID). One extra day absorbs clock skew and late activity flushes.
 */
const EVENT_TIMESTAMP_SLACK_MS = 8 * DAY_MS;

type TimeWindow = { start: Date; end?: Date };

export function executeQuestDBReadQuery<T>(query: string): Promise<T[]> {
  return executeQuery<T>(query);
}

function windowConditions(window: TimeWindow | undefined): string[] {
  if (!window) {
    return [];
  }
  const conditions = [`timestamp >= ${timestampLiteral(window.start)}`];
  if (window.end) {
    conditions.push(`timestamp <= ${timestampLiteral(window.end)}`);
  }
  return conditions;
}

export function buildExploreEventsSubquery(options: {
  selectClause: string;
  conditions: string[];
  startDate?: string;
  endDate?: string;
}): string {
  return buildEventReadUnion(options.selectClause, [
    ...options.conditions,
    ...dateRangeConditions(options.startDate, options.endDate),
  ]);
}

/** Superset of the timestamps of a session's events, for partition pruning. */
export function sessionEventWindow(session: {
  startedAt: Date;
  lastActivityAt: Date;
}): TimeWindow {
  return {
    start: new Date(session.startedAt.getTime() - EVENT_TIMESTAMP_SLACK_MS),
    end: new Date(session.lastActivityAt.getTime() + EVENT_TIMESTAMP_SLACK_MS),
  };
}

/** Lower bound for a device's event timestamps, for partition pruning. */
export function deviceEventWindow(device: { firstSeen: Date }): TimeWindow {
  return {
    start: new Date(device.firstSeen.getTime() - EVENT_TIMESTAMP_SLACK_MS),
  };
}

export type EventQueryResult = {
  event_id: string;
  device_id: string;
  name: string;
  is_screen: boolean;
  is_debug: boolean | null;
  timestamp: string;
};

export type EventDetailResult = EventQueryResult & {
  session_id: string;
  params: string | null;
};

export type GetEventsOptions = {
  appId: string;
  sessionId?: string;
  deviceId?: string;
  eventName?: string;
  startDate?: string;
  endDate?: string;
  /** Known bounds of every matching event (see sessionEventWindow). */
  scanWindow?: TimeWindow;
  limit?: number;
  offset?: number;
};

export async function getEvents(
  options: GetEventsOptions
): Promise<{ events: EventQueryResult[]; total: number }> {
  const conditions = [appCondition(options.appId)];

  if (options.sessionId) {
    validateIdentifier(options.sessionId, 'sessionId');
    conditions.push(`session_id = '${escapeSqlString(options.sessionId)}'`);
  } else if (options.deviceId) {
    validateIdentifier(options.deviceId, 'deviceId');
    conditions.push(`device_id = '${escapeSqlString(options.deviceId)}'`);
  }

  if (options.eventName) {
    validateSymbol(options.eventName, 'eventName');
    assertExploreEventName(options.eventName);
    conditions.push(`name = '${escapeSqlString(options.eventName)}'`);
  }

  conditions.push(
    ...dateRangeConditions(options.startDate, options.endDate),
    ...windowConditions(options.scanWindow)
  );

  const limit = sanitizeNumeric(options.limit, 10, 1, 1000);
  const offset = sanitizeNumeric(options.offset, 0, 0, 1_000_000);
  const end = offset + limit;

  // Each branch only needs its newest `end` rows for the merged page.
  const events = await executeQuery<EventQueryResult>(`
    SELECT
      CAST(event_id AS VARCHAR) AS event_id,
      CAST(device_id AS VARCHAR) AS device_id,
      CAST(name AS VARCHAR) AS name,
      is_screen,
      COALESCE(is_debug, false) AS is_debug,
      to_str(timestamp, '${EVENT_TIMESTAMP_FORMAT}') AS timestamp
    FROM (
      ${buildEventReadUnion(
        'event_id, device_id, name, is_screen, is_debug, timestamp',
        conditions,
        {
          includeDebugData: true,
          branchSuffix: `ORDER BY timestamp DESC LIMIT ${end}`,
        }
      )}
    ) event_rows
    ORDER BY timestamp DESC
    ${offset > 0 ? `LIMIT ${offset},${end}` : `LIMIT ${limit}`}
  `);

  // A short page is the last one, so the total is exact without counting.
  if (events.length < limit && (events.length > 0 || offset === 0)) {
    return { events, total: offset + events.length };
  }

  const counted = await cachedRead(
    {
      appId: options.appId,
      scope: 'events:count',
      params: { conditions },
      ttlSeconds: READ_CACHE_TTL.short,
    },
    () => countEventRows(conditions, true)
  );
  // A cached count may lag rows that arrived since; never report fewer
  // rows than this page proves exist.
  const seen = events.length > 0 ? offset + events.length : 0;
  return { events, total: Math.max(counted, seen) };
}

/** Creation time encoded in a ULID, or null when the id is not a ULID. */
export function decodeUlidTime(id: string): Date | null {
  if (!ULID_REGEX.test(id)) {
    return null;
  }
  let ms = 0;
  for (const char of id.slice(0, 10).toUpperCase()) {
    ms = ms * 32 + CROCKFORD_BASE32.indexOf(char);
  }
  return new Date(ms);
}

function eventIdWindow(
  eventId: string,
  timestampHint: string | undefined
): TimeWindow | null {
  if (timestampHint) {
    const hint = new Date(timestampHint);
    if (!Number.isNaN(hint.getTime())) {
      return {
        start: new Date(hint.getTime() - 1000),
        end: new Date(hint.getTime() + 1000),
      };
    }
  }

  const created = decodeUlidTime(eventId);
  const year = created?.getUTCFullYear() ?? 0;
  if (!created || year < 2020 || year > 2050) {
    return null;
  }
  // Ids are minted at track time or later (offline queue backfill, server
  // fallback), and client clocks may run up to an hour ahead.
  return {
    start: new Date(created.getTime() - EVENT_TIMESTAMP_SLACK_MS),
    end: new Date(created.getTime() + DAY_MS),
  };
}

export type GetEventByIdOptions = {
  eventId: string;
  appId: string;
  /** Event timestamp if the caller already knows it (e.g. from a list row). */
  timestampHint?: string;
};

async function findEvent(
  conditions: string[]
): Promise<EventDetailResult | null> {
  const [event] = await executeQuery<EventDetailResult>(`
    SELECT
      CAST(event_id AS VARCHAR) AS event_id,
      CAST(session_id AS VARCHAR) AS session_id,
      CAST(device_id AS VARCHAR) AS device_id,
      CAST(name AS VARCHAR) AS name,
      CAST(params AS VARCHAR) AS params,
      is_screen,
      COALESCE(is_debug, false) AS is_debug,
      to_str(timestamp, '${EVENT_TIMESTAMP_FORMAT}') AS timestamp
    FROM (
      ${buildEventReadUnion(
        'event_id, session_id, device_id, name, params, is_screen, is_debug, timestamp',
        conditions,
        { includeDebugData: true }
      )}
    ) event_rows
    ORDER BY timestamp DESC
    LIMIT 1
  `);
  return event ?? null;
}

/**
 * Looks the event up inside the window implied by the hint or ULID first so
 * QuestDB can prune partitions; a miss falls back to the unbounded search, so
 * a wrong guess only costs time, never a false 404.
 */
export async function getEventById(
  options: GetEventByIdOptions
): Promise<EventDetailResult | null> {
  validateIdentifier(options.eventId, 'eventId');
  const conditions = [
    `event_id = '${escapeSqlString(options.eventId)}'`,
    appCondition(options.appId),
  ];

  const window = eventIdWindow(options.eventId, options.timestampHint);
  if (window) {
    const event = await findEvent([...conditions, ...windowConditions(window)]);
    if (event) {
      return event;
    }
  }
  return await findEvent(conditions);
}

/** Non-debug events across all apps (admin stats). */
export function getTotalEventCount(): Promise<number> {
  return countEventRows([], false);
}
