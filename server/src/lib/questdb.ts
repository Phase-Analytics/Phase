import { Sender } from '@questdb/nodejs-client';

const QUESTDB_HTTP = 'http://questdb:9000';
const QUESTDB_ILP_HOST = 'questdb';
const QUESTDB_ILP_PORT = 9009;

let sender: Sender | null = null;

async function getSender(): Promise<Sender> {
  if (!sender) {
    try {
      console.log(
        `[QuestDB] Connecting to ILP at ${QUESTDB_ILP_HOST}:${QUESTDB_ILP_PORT}`
      );
      sender = await Sender.fromConfig(
        `tcp::addr=${QUESTDB_ILP_HOST}:${QUESTDB_ILP_PORT};auto_flush=on;auto_flush_rows=1000;`
      );
      console.log('[QuestDB] ILP connection established');
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

export type ErrorRecord = {
  errorId: string;
  sessionId: string;
  deviceId: string;
  appId: string;
  message: string;
  type: string;
  stackTrace: string | null;
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

  client.at(event.timestamp.getTime() * 1_000_000, 'ns');
}

export async function writeError(error: ErrorRecord): Promise<void> {
  const client = await getSender();

  client
    .table('errors')
    .symbol('error_id', error.errorId)
    .symbol('session_id', error.sessionId)
    .symbol('device_id', error.deviceId)
    .symbol('app_id', error.appId)
    .symbol('type', error.type)
    .stringColumn('message', error.message);

  if (error.stackTrace !== null) {
    client.stringColumn('stack_trace', error.stackTrace);
  }

  client.at(error.timestamp.getTime() * 1_000_000, 'ns');
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

export type ErrorQueryResult = {
  error_id: string;
  session_id: string;
  message: string;
  type: string;
  stack_trace: string | null;
  timestamp: string;
};

export type ActivityQueryResult = {
  type: 'event' | 'error';
  id: string;
  session_id: string;
  timestamp: string;
  data: string;
};

type ActivityRawResult = {
  type: 'event' | 'error';
  id: string;
  session_id: string;
  timestamp: string;
  name?: string;
  params?: string | null;
  message?: string;
  error_type?: string;
  stack_trace?: string | null;
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
  }

  if (options.deviceId) {
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

export type GetErrorsOptions = {
  sessionId?: string;
  deviceId?: string;
  appId?: string;
  errorType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
};

export async function getErrors(
  options: GetErrorsOptions
): Promise<{ errors: ErrorQueryResult[]; total: number }> {
  const conditions: string[] = [];

  if (options.sessionId) {
    validateIdentifier(options.sessionId, 'sessionId');
    conditions.push(`session_id = '${escapeSqlString(options.sessionId)}'`);
  }

  if (options.deviceId) {
    validateIdentifier(options.deviceId, 'deviceId');
    conditions.push(`device_id = '${escapeSqlString(options.deviceId)}'`);
  }

  if (options.appId) {
    validateIdentifier(options.appId, 'appId');
    conditions.push(`app_id = '${escapeSqlString(options.appId)}'`);
  }

  if (options.errorType) {
    validateSymbol(options.errorType, 'errorType');
    conditions.push(`type = '${escapeSqlString(options.errorType)}'`);
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

  const errorsQuery = `
    SELECT error_id, session_id, message, type, stack_trace, timestamp
    FROM errors
    ${whereClause}
    ORDER BY timestamp DESC
    ${limitClause}
  `;

  const countQuery = `
    SELECT COUNT(*) as count 
    FROM errors 
    ${whereClause}
  `;

  const [errors, countResult] = await Promise.all([
    executeQuery<ErrorQueryResult>(errorsQuery),
    executeQuery<{ count: number }>(countQuery),
  ]);

  return {
    errors,
    total: countResult[0]?.count || 0,
  };
}

export type GetActivityOptions = {
  sessionId: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
};

export async function getActivity(
  options: GetActivityOptions
): Promise<{ activities: ActivityQueryResult[]; total: number }> {
  validateIdentifier(options.sessionId, 'sessionId');

  const conditions: string[] = [
    `session_id = '${escapeSqlString(options.sessionId)}'`,
  ];

  if (options.startDate) {
    validateTimestamp(options.startDate, 'startDate');
    conditions.push(`timestamp >= '${escapeSqlString(options.startDate)}'`);
  }

  if (options.endDate) {
    validateTimestamp(options.endDate, 'endDate');
    conditions.push(`timestamp <= '${escapeSqlString(options.endDate)}'`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const limit = sanitizeNumeric(options.limit, 20, 1, 1000);
  const offset = sanitizeNumeric(options.offset, 0, 0, 1_000_000);

  const limitClause =
    offset > 0 ? `LIMIT ${offset}, ${limit}` : `LIMIT ${limit}`;

  const activitiesQuery = `
    SELECT * FROM (
      SELECT
        'event' as type,
        event_id as id,
        session_id,
        timestamp,
        name,
        params,
        null as message,
        null as error_type,
        null as stack_trace
      FROM events
      ${whereClause}
      UNION ALL
      SELECT
        'error' as type,
        error_id as id,
        session_id,
        timestamp,
        null as name,
        null as params,
        message,
        type as error_type,
        stack_trace
      FROM errors
      ${whereClause}
    )
    ORDER BY timestamp DESC
    ${limitClause}
  `;

  const countQuery = `
    SELECT 
      (SELECT COUNT(*) FROM events ${whereClause}) + 
      (SELECT COUNT(*) FROM errors ${whereClause}) as count
  `;

  const [rawActivities, countResult] = await Promise.all([
    executeQuery<ActivityRawResult>(activitiesQuery),
    executeQuery<{ count: number }>(countQuery),
  ]);

  const activities: ActivityQueryResult[] = rawActivities.map((row) => {
    let data: string;

    if (row.type === 'event') {
      let parsedParams: Record<string, unknown> | null = null;
      try {
        parsedParams = row.params ? JSON.parse(row.params) : null;
      } catch (e) {
        console.error('[QuestDB] Invalid JSON in event params:', e);
        parsedParams = null;
      }
      data = JSON.stringify({
        name: row.name || '',
        params: parsedParams,
      });
    } else {
      data = JSON.stringify({
        message: row.message || '',
        type: row.error_type || '',
        stackTrace: row.stack_trace || null,
      });
    }

    return {
      type: row.type,
      id: row.id,
      session_id: row.session_id,
      timestamp: row.timestamp,
      data,
    };
  });

  return {
    activities,
    total: countResult[0]?.count || 0,
  };
}

export async function initQuestDB(): Promise<void> {
  if (initPromise) {
    return await initPromise;
  }

  if (tablesInitialized) {
    console.log('[QuestDB] Tables already initialized, skipping...');
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

      console.log('[QuestDB] Events table created/verified');

      const errorsTableQuery = `
        CREATE TABLE IF NOT EXISTS errors (
          error_id SYMBOL,
          session_id SYMBOL,
          device_id SYMBOL,
          app_id SYMBOL,
          message STRING,
          type SYMBOL,
          stack_trace STRING,
          timestamp TIMESTAMP
        ) TIMESTAMP(timestamp) PARTITION BY WEEK
      `;

      const errorsResponse = await fetch(
        `${url}?query=${encodeURIComponent(errorsTableQuery)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!errorsResponse.ok) {
        const errorText = await errorsResponse.text();
        throw new Error(
          `Failed to create errors table: ${errorsResponse.status} - ${errorText}`
        );
      }

      console.log('[QuestDB] Errors table created/verified');

      tablesInitialized = true;
      console.log('[QuestDB] Initialization complete');
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
