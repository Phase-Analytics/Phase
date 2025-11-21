import { Sender } from '@questdb/nodejs-client';

const QUESTDB_HTTP = 'http://questdb:9000';
const QUESTDB_ILP_HOST = 'questdb';
const QUESTDB_ILP_PORT = 9009;

let sender: Sender | null = null;

async function getSender(): Promise<Sender> {
  if (!sender) {
    try {
      sender = await Sender.fromConfig(
        `tcp::addr=${QUESTDB_ILP_HOST}:${QUESTDB_ILP_PORT};auto_flush=on;auto_flush_rows=1000;`
      );
    } catch (error) {
      console.error('[QuestDB] Failed to connect to ILP:', error);
      throw new Error(
        `Failed to connect to QuestDB ILP: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  if (!sender) {
    throw new Error('[QuestDB] Sender is null after initialization');
  }

  return sender;
}

let tablesInitialized = false;
let initPromise: Promise<void> | null = null;

const IDENTIFIER_REGEX = /^[a-zA-Z0-9_-]+$/;
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally checking for control characters
const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/;

export type EventRecord = {
  eventId: string;
  sessionId: string;
  deviceId: string;
  appId: string;
  name: string;
  params: Record<string, string | number | boolean | null> | null;
  timestamp: Date;
};

export async function writeEvent(event: EventRecord): Promise<void> {
  const client = await getSender();

  client
    .table('events')
    .symbol('event_id', event.eventId)
    .symbol('session_id', event.sessionId)
    .symbol('device_id', event.deviceId)
    .symbol('app_id', event.appId)
    .symbol('name', event.name);

  if (event.params !== null) {
    const paramsJson = JSON.stringify(event.params);
    client.stringColumn('params', paramsJson);
  }

  client.at(BigInt(event.timestamp.getTime() * 1_000_000), 'ns');
}

type QueryResponse<T> = {
  query: string;
  columns: Array<{ name: string; type: string }>;
  dataset: T[];
  count: number;
  timings: {
    compiler: number;
    count: number;
    execute: number;
  };
};

function escapeSqlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "''");
}

function validateIdentifier(value: string, fieldName: string): void {
  if (!IDENTIFIER_REGEX.test(value)) {
    throw new Error(
      `Invalid ${fieldName}: contains unexpected characters. Only alphanumeric, hyphens, and underscores are allowed.`
    );
  }
  if (value.length > 128) {
    throw new Error(`Invalid ${fieldName}: exceeds maximum length of 128`);
  }
}

function validateSymbol(value: string, fieldName: string): void {
  if (value.length > 256) {
    throw new Error(`Invalid ${fieldName}: exceeds maximum length of 256`);
  }
  if (CONTROL_CHARS_REGEX.test(value)) {
    throw new Error(`Invalid ${fieldName}: contains control characters`);
  }
}

function validateTimestamp(value: string, fieldName: string): void {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}: not a valid ISO 8601 timestamp`);
  }
  const year = date.getFullYear();
  if (year < 2020 || year > 2050) {
    throw new Error(
      `Invalid ${fieldName}: timestamp year must be between 2000 and 2100`
    );
  }
}

function sanitizeNumeric(
  value: number | undefined,
  defaultValue: number,
  min: number,
  max: number
): number {
  if (value === undefined) {
    return defaultValue;
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    return defaultValue;
  }
  return Math.max(min, Math.min(Math.floor(num), max));
}

async function executeQuery<T>(query: string): Promise<T[]> {
  const url = `${QUESTDB_HTTP}/exec`;

  const response = await fetch(`${url}?query=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `QuestDB query failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const result = (await response.json()) as QueryResponse<T>;
  return result.dataset;
}

export type EventQueryResult = {
  event_id: string;
  session_id: string;
  name: string;
  params: string | null;
  timestamp: string;
};

export type EventDetailResult = {
  event_id: string;
  session_id: string;
  name: string;
  params: string | null;
  timestamp: string;
};

export type GetEventsOptions = {
  sessionId?: string;
  deviceId?: string;
  appId?: string;
  eventName?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
};

export async function getEvents(
  options: GetEventsOptions
): Promise<{ events: EventQueryResult[]; total: number }> {
  const conditions: string[] = [];

  if (options.sessionId) {
    validateIdentifier(options.sessionId, 'sessionId');
    conditions.push(`session_id = '${escapeSqlString(options.sessionId)}'`);
  } else if (options.deviceId) {
    validateIdentifier(options.deviceId, 'deviceId');
    conditions.push(`device_id = '${escapeSqlString(options.deviceId)}'`);
  }

  if (options.appId) {
    validateIdentifier(options.appId, 'appId');
    conditions.push(`app_id = '${escapeSqlString(options.appId)}'`);
  }

  if (options.eventName) {
    validateSymbol(options.eventName, 'eventName');
    conditions.push(`name = '${escapeSqlString(options.eventName)}'`);
  }

  if (options.startDate) {
    validateTimestamp(options.startDate, 'startDate');
    conditions.push(`timestamp >= '${escapeSqlString(options.startDate)}'`);
  }

  if (options.endDate) {
    validateTimestamp(options.endDate, 'endDate');
    conditions.push(`timestamp <= '${escapeSqlString(options.endDate)}'`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = sanitizeNumeric(options.limit, 20, 1, 1000);
  const offset = sanitizeNumeric(options.offset, 0, 0, 1_000_000);

  const limitClause =
    offset > 0 ? `LIMIT ${offset}, ${limit}` : `LIMIT ${limit}`;

  const eventsQuery = `
    SELECT event_id, session_id, name, params, timestamp
    FROM events
    ${whereClause}
    ORDER BY timestamp DESC
    ${limitClause}
  `;

  const countQuery = `
    SELECT COUNT(*) as count 
    FROM events 
    ${whereClause}
  `;

  const [events, countResult] = await Promise.all([
    executeQuery<EventQueryResult>(eventsQuery),
    executeQuery<{ count: number }>(countQuery),
  ]);

  return {
    events,
    total: countResult[0]?.count || 0,
  };
}

export type TopEventQueryResult = {
  name: string;
  count: number;
};

export type GetTopEventsOptions = {
  appId: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
};

export async function getTopEvents(
  options: GetTopEventsOptions
): Promise<TopEventQueryResult[]> {
  validateIdentifier(options.appId, 'appId');

  const conditions: string[] = [`app_id = '${escapeSqlString(options.appId)}'`];

  if (options.startDate) {
    validateTimestamp(options.startDate, 'startDate');
    conditions.push(`timestamp >= '${escapeSqlString(options.startDate)}'`);
  }

  if (options.endDate) {
    validateTimestamp(options.endDate, 'endDate');
    conditions.push(`timestamp <= '${escapeSqlString(options.endDate)}'`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const limit = sanitizeNumeric(options.limit, 10, 1, 10);

  const topEventsQuery = `
    SELECT name, COUNT(*) as count
    FROM events
    ${whereClause}
    GROUP BY name
    ORDER BY count DESC
    LIMIT ${limit}
  `;

  return await executeQuery<TopEventQueryResult>(topEventsQuery);
}

export type GetEventByIdOptions = {
  eventId: string;
  appId: string;
};

export async function getEventById(
  options: GetEventByIdOptions
): Promise<EventDetailResult | null> {
  validateIdentifier(options.eventId, 'eventId');
  validateIdentifier(options.appId, 'appId');

  const query = `
    SELECT event_id, session_id, name, params, timestamp
    FROM events
    WHERE event_id = '${escapeSqlString(options.eventId)}'
    AND app_id = '${escapeSqlString(options.appId)}'
    LIMIT 1
  `;

  const results = await executeQuery<EventDetailResult>(query);
  return results[0] || null;
}

export type GetEventStatsOptions = {
  appId: string;
};

export async function getEventStats(options: GetEventStatsOptions): Promise<{
  totalEvents: number;
  events24h: number;
  totalEventsChange24h: number;
  events24hChange: number;
}> {
  validateIdentifier(options.appId, 'appId');

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .replace('Z', '');
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .replace('Z', '');

  const [
    totalResult,
    totalYesterdayResult,
    events24hResult,
    eventsYesterdayResult,
  ] = await Promise.all([
    executeQuery<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM events
      WHERE app_id = '${escapeSqlString(options.appId)}'
    `),
    executeQuery<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM events
      WHERE app_id = '${escapeSqlString(options.appId)}'
      AND timestamp < '${twentyFourHoursAgo}'
    `),
    executeQuery<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM events
      WHERE app_id = '${escapeSqlString(options.appId)}'
      AND timestamp >= '${twentyFourHoursAgo}'
    `),
    executeQuery<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM events
      WHERE app_id = '${escapeSqlString(options.appId)}'
      AND timestamp >= '${fortyEightHoursAgo}'
      AND timestamp < '${twentyFourHoursAgo}'
    `),
  ]);

  const totalEvents = totalResult[0]?.count || 0;
  const totalEventsYesterday = totalYesterdayResult[0]?.count || 0;
  const events24h = events24hResult[0]?.count || 0;
  const eventsYesterday = eventsYesterdayResult[0]?.count || 0;

  const totalEventsYesterdayForCalc = Math.max(totalEventsYesterday, 1);
  const totalEventsChange24h =
    ((totalEvents - totalEventsYesterday) / totalEventsYesterdayForCalc) * 100;

  const eventsYesterdayForCalc = Math.max(eventsYesterday, 1);
  const events24hChange =
    ((events24h - eventsYesterday) / eventsYesterdayForCalc) * 100;

  return {
    totalEvents,
    events24h,
    totalEventsChange24h: Number(totalEventsChange24h.toFixed(2)),
    events24hChange: Number(events24hChange.toFixed(2)),
  };
}

export async function initQuestDB(): Promise<void> {
  if (initPromise) {
    return await initPromise;
  }

  if (tablesInitialized) {
    return Promise.resolve();
  }

  initPromise = (async () => {
    const url = `${QUESTDB_HTTP}/exec`;

    try {
      const eventsTableQuery = `
        CREATE TABLE IF NOT EXISTS events (
          event_id SYMBOL,
          session_id SYMBOL,
          device_id SYMBOL,
          app_id SYMBOL,
          name SYMBOL,
          params STRING,
          timestamp TIMESTAMP
        ) TIMESTAMP(timestamp) PARTITION BY WEEK
      `;

      const eventsResponse = await fetch(
        `${url}?query=${encodeURIComponent(eventsTableQuery)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!eventsResponse.ok) {
        const errorText = await eventsResponse.text();
        throw new Error(
          `Failed to create events table: ${eventsResponse.status} - ${errorText}`
        );
      }

      tablesInitialized = true;
    } catch (error) {
      console.error('[QuestDB] Initialization failed:', error);
      initPromise = null;
      throw error;
    }
  })();

  return await initPromise;
}

export async function closeQuestDB(): Promise<void> {
  if (sender) {
    await sender.flush();
    await sender.close();
    sender = null;
  }
}
