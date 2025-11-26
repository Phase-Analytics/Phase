const QUESTDB_HTTP = 'http://questdb:9000';

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
  const url = `${QUESTDB_HTTP}/exec`;

  const paramsValue =
    event.params !== null
      ? `'${escapeSqlString(JSON.stringify(event.params))}'`
      : 'null';
  const timestampMicros = event.timestamp.getTime() * 1000;

  const query = `
    INSERT INTO events (event_id, session_id, device_id, app_id, name, params, timestamp)
    VALUES (
      '${escapeSqlString(event.eventId)}',
      '${escapeSqlString(event.sessionId)}',
      '${escapeSqlString(event.deviceId)}',
      '${escapeSqlString(event.appId)}',
      '${escapeSqlString(event.name)}',
      ${paramsValue},
      ${timestampMicros}
    )
  `;

  const response = await fetch(`${url}?query=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `QuestDB insert failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }
}

type QueryResponse = {
  query: string;
  columns: Array<{ name: string; type: string }>;
  dataset: unknown[][];
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

  const result = (await response.json()) as QueryResponse;

  const { columns, dataset } = result;
  return dataset.map((row) => {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < columns.length; i++) {
      obj[columns[i].name] = row[i];
    }
    return obj as T;
  });
}

export type EventQueryResult = {
  event_id: string;
  session_id: string;
  device_id: string;
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
    SELECT event_id, session_id, device_id, name, params, to_str(timestamp, 'yyyy-MM-ddTHH:mm:ss.SSSUUUZ') as timestamp
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
  const limit = sanitizeNumeric(options.limit, 6, 1, 6);

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
    SELECT event_id, session_id, name, params, to_str(timestamp, 'yyyy-MM-ddTHH:mm:ss.SSSUUUZ') as timestamp
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
  const twentyFourHoursAgo = (now.getTime() - 24 * 60 * 60 * 1000) * 1000;
  const fortyEightHoursAgo = (now.getTime() - 48 * 60 * 60 * 1000) * 1000;

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
      AND timestamp < ${twentyFourHoursAgo}
    `),
    executeQuery<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM events
      WHERE app_id = '${escapeSqlString(options.appId)}'
      AND timestamp >= ${twentyFourHoursAgo}
    `),
    executeQuery<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM events
      WHERE app_id = '${escapeSqlString(options.appId)}'
      AND timestamp >= ${fortyEightHoursAgo}
      AND timestamp < ${twentyFourHoursAgo}
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
          event_id SYMBOL CAPACITY 256 CACHE,
          session_id SYMBOL CAPACITY 256 CACHE INDEX CAPACITY 1048576,
          device_id SYMBOL CAPACITY 256 CACHE,
          app_id SYMBOL CAPACITY 64 CACHE INDEX CAPACITY 262144,
          name SYMBOL CAPACITY 256 CACHE,
          params STRING,
          timestamp TIMESTAMP
        ) TIMESTAMP(timestamp) PARTITION BY WEEK WAL DEDUP UPSERT KEYS(timestamp, event_id)
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
      console.log('[QuestDB] Events table initialized with WAL and indexes');
    } catch (error) {
      console.error('[QuestDB] Initialization failed:', error);
      initPromise = null;
      throw error;
    }
  })();

  return await initPromise;
}

export type EventTimeseriesDataPoint = {
  date: string;
  dailyEvents: number;
};

export type GetEventTimeseriesOptions = {
  appId: string;
  startDate?: string;
  endDate?: string;
};

export async function getEventTimeseries(
  options: GetEventTimeseriesOptions
): Promise<{
  data: EventTimeseriesDataPoint[];
  period: { startDate: string; endDate: string };
}> {
  validateIdentifier(options.appId, 'appId');

  const now = new Date();
  const defaultStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const start = options.startDate ? new Date(options.startDate) : defaultStart;
  const end = options.endDate ? new Date(options.endDate) : now;

  const startTimestamp = start.getTime() * 1000;
  const endTimestamp = end.getTime() * 1000;

  const query = `
    SELECT
      to_str(timestamp, 'yyyy-MM-dd') as date,
      COUNT(*) as count
    FROM events
    WHERE app_id = '${escapeSqlString(options.appId)}'
    AND timestamp >= ${startTimestamp}
    AND timestamp < ${endTimestamp}
    GROUP BY to_str(timestamp, 'yyyy-MM-dd')
    ORDER BY date
  `;

  const results = await executeQuery<{ date: string; count: number }>(query);

  const dataMap = new Map<string, number>();
  for (const row of results) {
    dataMap.set(row.date, Number(row.count));
  }

  const data: EventTimeseriesDataPoint[] = [];
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0];
    data.push({
      date: dateStr,
      dailyEvents: dataMap.get(dateStr) || 0,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    data,
    period: {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
  };
}

export async function closeQuestDB(): Promise<void> {
  // No-op: HTTP doesn't need cleanup
}
