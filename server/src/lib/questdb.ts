if (!process.env.QUESTDB_HTTP_URL || !process.env.QUESTDB_USER || !process.env.QUESTDB_PASSWORD) {
  throw new Error('QUESTDB_HTTP_URL, QUESTDB_USER, and QUESTDB_PASSWORD must be set');
}

const QUESTDB_HTTP_URL = process.env.QUESTDB_HTTP_URL;
const QUESTDB_USER = process.env.QUESTDB_USER;
const QUESTDB_PASSWORD = process.env.QUESTDB_PASSWORD;

let tablesInitialized = false;
let initPromise: Promise<void> | null = null;

export type EventRecord = {
  eventId: string;
  sessionId: string;
  deviceId: string;
  apiKeyId: string;
  name: string;
  params: Record<string, string | number | boolean | null> | null;
  timestamp: Date;
};

export type ErrorRecord = {
  errorId: string;
  sessionId: string;
  deviceId: string;
  apiKeyId: string;
  message: string;
  type: string;
  stackTrace: string | null;
  timestamp: Date;
};

export async function writeEvent(event: EventRecord): Promise<void> {
  const auth = Buffer.from(`${QUESTDB_USER}:${QUESTDB_PASSWORD}`).toString('base64');
  const timestampNs = event.timestamp.getTime() * 1000000;
  
  const escapeSymbol = (value: string) => value.replace(/[,= \n\r]/g, (match) => {
    if (match === '\n') return '\\n';
    if (match === '\r') return '\\r';
    return `\\${match}`;
  });
  const escapeString = (value: string) => value.replace(/["\\]/g, '\\$&').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  
  const symbols = [
    `event_id=${escapeSymbol(event.eventId)}`,
    `session_id=${escapeSymbol(event.sessionId)}`,
    `device_id=${escapeSymbol(event.deviceId)}`,
    `api_key_id=${escapeSymbol(event.apiKeyId)}`,
    `name=${escapeSymbol(event.name)}`,
  ].join(',');
  
  let ilpLine: string;
  if (event.params !== null) {
    const paramsJson = JSON.stringify(event.params);
    ilpLine = `events,${symbols} params="${escapeString(paramsJson)}" ${timestampNs}`;
  } else {
    ilpLine = `events,${symbols} ${timestampNs}`;
  }
  
  const response = await fetch(`${QUESTDB_HTTP_URL}/write`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'text/plain',
    },
    body: ilpLine,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`QuestDB write failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
}

export async function writeError(error: ErrorRecord): Promise<void> {
  const auth = Buffer.from(`${QUESTDB_USER}:${QUESTDB_PASSWORD}`).toString('base64');
  const timestampNs = error.timestamp.getTime() * 1000000;
  
  const escapeSymbol = (value: string) => value.replace(/[,= \n\r]/g, (match) => {
    if (match === '\n') return '\\n';
    if (match === '\r') return '\\r';
    return `\\${match}`;
  });
  const escapeString = (value: string) => value.replace(/["\\]/g, '\\$&').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  
  const symbols = [
    `error_id=${escapeSymbol(error.errorId)}`,
    `session_id=${escapeSymbol(error.sessionId)}`,
    `device_id=${escapeSymbol(error.deviceId)}`,
    `api_key_id=${escapeSymbol(error.apiKeyId)}`,
    `type=${escapeSymbol(error.type)}`,
  ].join(',');
  
  const fields: string[] = [`message="${escapeString(error.message)}"`];
  if (error.stackTrace !== null) {
    fields.push(`stack_trace="${escapeString(error.stackTrace)}"`);
  }
  
  const ilpLine = `errors,${symbols} ${fields.join(',')} ${timestampNs}`;
  
  const response = await fetch(`${QUESTDB_HTTP_URL}/write`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'text/plain',
    },
    body: ilpLine,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`QuestDB write failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
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
  return value.replace(/'/g, "''");
}


function sanitizeNumeric(value: number | undefined, defaultValue: number, min: number, max: number): number {
  if (value === undefined) return defaultValue;
  const num = Number(value);
  if (Number.isNaN(num)) return defaultValue;
  return Math.max(min, Math.min(Math.floor(num), max));
}

async function executeQuery<T>(query: string): Promise<T[]> {
  const url = `${QUESTDB_HTTP_URL}/exec`;
  const auth = Buffer.from(`${QUESTDB_USER}:${QUESTDB_PASSWORD}`).toString('base64');
  
  const response = await fetch(`${url}?query=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`QuestDB query failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json() as QueryResponse<T>;
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
  apiKeyId?: string;
  eventName?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
};

export async function getEvents(options: GetEventsOptions): Promise<{ events: EventQueryResult[]; total: number }> {
  const conditions: string[] = [];
  
  if (options.sessionId) {
    conditions.push(`session_id = '${escapeSqlString(options.sessionId)}'`);
  }
  
  if (options.deviceId) {
    conditions.push(`device_id = '${escapeSqlString(options.deviceId)}'`);
  }
  
  if (options.apiKeyId) {
    conditions.push(`api_key_id = '${escapeSqlString(options.apiKeyId)}'`);
  }
  
  if (options.eventName) {
    conditions.push(`name = '${escapeSqlString(options.eventName)}'`);
  }
  
  if (options.startDate) {
    conditions.push(`timestamp >= '${escapeSqlString(options.startDate)}'`);
  }
  
  if (options.endDate) {
    conditions.push(`timestamp <= '${escapeSqlString(options.endDate)}'`);
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = sanitizeNumeric(options.limit, 20, 1, 1000);
  const offset = sanitizeNumeric(options.offset, 0, 0, 1000000);
  
  const eventsQuery = `
    SELECT event_id, session_id, name, params, timestamp 
    FROM events 
    ${whereClause} 
    ORDER BY timestamp DESC 
    LIMIT ${limit} OFFSET ${offset}
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
  apiKeyId?: string;
  errorType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
};

export async function getErrors(options: GetErrorsOptions): Promise<{ errors: ErrorQueryResult[]; total: number }> {
  const conditions: string[] = [];
  
  if (options.sessionId) {
    conditions.push(`session_id = '${escapeSqlString(options.sessionId)}'`);
  }
  
  if (options.deviceId) {
    conditions.push(`device_id = '${escapeSqlString(options.deviceId)}'`);
  }
  
  if (options.apiKeyId) {
    conditions.push(`api_key_id = '${escapeSqlString(options.apiKeyId)}'`);
  }
  
  if (options.errorType) {
    conditions.push(`type = '${escapeSqlString(options.errorType)}'`);
  }
  
  if (options.startDate) {
    conditions.push(`timestamp >= '${escapeSqlString(options.startDate)}'`);
  }
  
  if (options.endDate) {
    conditions.push(`timestamp <= '${escapeSqlString(options.endDate)}'`);
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = sanitizeNumeric(options.limit, 20, 1, 1000);
  const offset = sanitizeNumeric(options.offset, 0, 0, 1000000);
  
  const errorsQuery = `
    SELECT error_id, session_id, message, type, stack_trace, timestamp 
    FROM errors 
    ${whereClause} 
    ORDER BY timestamp DESC 
    LIMIT ${limit} OFFSET ${offset}
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

export async function getActivity(options: GetActivityOptions): Promise<{ activities: ActivityQueryResult[]; total: number }> {
  const conditions: string[] = [`session_id = '${escapeSqlString(options.sessionId)}'`];
  
  if (options.startDate) {
    conditions.push(`timestamp >= '${escapeSqlString(options.startDate)}'`);
  }
  
  if (options.endDate) {
    conditions.push(`timestamp <= '${escapeSqlString(options.endDate)}'`);
  }
  
  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const limit = sanitizeNumeric(options.limit, 20, 1, 1000);
  const offset = sanitizeNumeric(options.offset, 0, 0, 1000000);
  
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
    LIMIT ${limit} OFFSET ${offset}
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
      data = JSON.stringify({
        name: row.name || '',
        params: row.params ? JSON.parse(row.params) : null,
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
    return initPromise;
  }

  if (tablesInitialized) {
    console.log('[QuestDB] Tables already initialized, skipping...');
    return;
  }

  initPromise = (async () => {
    const url = `${QUESTDB_HTTP_URL}/exec`;
    const auth = Buffer.from(`${QUESTDB_USER}:${QUESTDB_PASSWORD}`).toString('base64');

    try {
      const eventsTableQuery = `
        CREATE TABLE IF NOT EXISTS events (
          event_id SYMBOL,
          session_id SYMBOL,
          device_id SYMBOL,
          api_key_id SYMBOL,
          name SYMBOL,
          params STRING,
          timestamp TIMESTAMP
        ) TIMESTAMP(timestamp) PARTITION BY WEEK
      `;

      const eventsResponse = await fetch(`${url}?query=${encodeURIComponent(eventsTableQuery)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      if (!eventsResponse.ok) {
        const errorText = await eventsResponse.text();
        throw new Error(`Failed to create events table: ${eventsResponse.status} - ${errorText}`);
      }

      console.log('[QuestDB] Events table created/verified');

      const errorsTableQuery = `
        CREATE TABLE IF NOT EXISTS errors (
          error_id SYMBOL,
          session_id SYMBOL,
          device_id SYMBOL,
          api_key_id SYMBOL,
          message STRING,
          type SYMBOL,
          stack_trace STRING,
          timestamp TIMESTAMP
        ) TIMESTAMP(timestamp) PARTITION BY WEEK
      `;

      const errorsResponse = await fetch(`${url}?query=${encodeURIComponent(errorsTableQuery)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      if (!errorsResponse.ok) {
        const errorText = await errorsResponse.text();
        throw new Error(`Failed to create errors table: ${errorsResponse.status} - ${errorText}`);
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

  return initPromise;
}
