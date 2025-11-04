import { Sender } from '@questdb/nodejs-client';

// Environment variables
const QUESTDB_HTTP_URL = process.env.QUESTDB_HTTP_URL || 'https://quest.db.telemetra.dev';
const QUESTDB_USER = process.env.QUESTDB_USER;
const QUESTDB_PASSWORD = process.env.QUESTDB_PASSWORD;

// Initialize flag to ensure tables are created only once
let tablesInitialized = false;

// Type definitions
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

// ILP Write Functions
export async function writeEvent(event: EventRecord): Promise<void> {
  const sender = Sender.fromConfig(`http::addr=${QUESTDB_HTTP_URL.replace('https://', '').replace('http://', '')};username=${QUESTDB_USER};password=${QUESTDB_PASSWORD};`);
  
  try {
    await sender.connect();
    
    const paramsJson = event.params ? JSON.stringify(event.params) : null;
    
    sender
      .table('events')
      .symbol('event_id', event.eventId)
      .symbol('session_id', event.sessionId)
      .symbol('device_id', event.deviceId)
      .symbol('api_key_id', event.apiKeyId)
      .symbol('name', event.name)
      .stringColumn('params', paramsJson)
      .at(event.timestamp.getTime() * 1000000, 'ns'); // Convert to nanoseconds
    
    await sender.flush();
  } finally {
    await sender.close();
  }
}

export async function writeError(error: ErrorRecord): Promise<void> {
  const sender = Sender.fromConfig(`http::addr=${QUESTDB_HTTP_URL.replace('https://', '').replace('http://', '')};username=${QUESTDB_USER};password=${QUESTDB_PASSWORD};`);
  
  try {
    await sender.connect();
    
    sender
      .table('errors')
      .symbol('error_id', error.errorId)
      .symbol('session_id', error.sessionId)
      .symbol('device_id', error.deviceId)
      .symbol('api_key_id', error.apiKeyId)
      .stringColumn('message', error.message)
      .symbol('type', error.type)
      .stringColumn('stack_trace', error.stackTrace)
      .at(error.timestamp.getTime() * 1000000, 'ns'); // Convert to nanoseconds
    
    await sender.flush();
  } finally {
    await sender.close();
  }
}

// REST Query Functions
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
    conditions.push(`session_id = '${options.sessionId}'`);
  }
  
  if (options.deviceId) {
    conditions.push(`device_id = '${options.deviceId}'`);
  }
  
  if (options.apiKeyId) {
    conditions.push(`api_key_id = '${options.apiKeyId}'`);
  }
  
  if (options.eventName) {
    conditions.push(`name = '${options.eventName}'`);
  }
  
  if (options.startDate) {
    conditions.push(`timestamp >= '${options.startDate}'`);
  }
  
  if (options.endDate) {
    conditions.push(`timestamp <= '${options.endDate}'`);
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = options.limit || 20;
  const offset = options.offset || 0;
  
  // Get events
  const eventsQuery = `
    SELECT event_id, session_id, name, params, timestamp 
    FROM events 
    ${whereClause} 
    ORDER BY timestamp DESC 
    LIMIT ${limit} OFFSET ${offset}
  `;
  
  // Get total count
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
    conditions.push(`session_id = '${options.sessionId}'`);
  }
  
  if (options.deviceId) {
    conditions.push(`device_id = '${options.deviceId}'`);
  }
  
  if (options.apiKeyId) {
    conditions.push(`api_key_id = '${options.apiKeyId}'`);
  }
  
  if (options.errorType) {
    conditions.push(`type = '${options.errorType}'`);
  }
  
  if (options.startDate) {
    conditions.push(`timestamp >= '${options.startDate}'`);
  }
  
  if (options.endDate) {
    conditions.push(`timestamp <= '${options.endDate}'`);
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = options.limit || 20;
  const offset = options.offset || 0;
  
  // Get errors
  const errorsQuery = `
    SELECT error_id, session_id, message, type, stack_trace, timestamp 
    FROM errors 
    ${whereClause} 
    ORDER BY timestamp DESC 
    LIMIT ${limit} OFFSET ${offset}
  `;
  
  // Get total count
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
  const conditions: string[] = [`session_id = '${options.sessionId}'`];
  
  if (options.startDate) {
    conditions.push(`timestamp >= '${options.startDate}'`);
  }
  
  if (options.endDate) {
    conditions.push(`timestamp <= '${options.endDate}'`);
  }
  
  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const limit = options.limit || 20;
  const offset = options.offset || 0;
  
  // Get activities using UNION ALL
  const activitiesQuery = `
    SELECT * FROM (
      SELECT 
        'event' as type,
        event_id as id,
        session_id,
        timestamp,
        '{"name":"' || name || '","params":' || COALESCE(params, 'null') || '}' as data
      FROM events
      ${whereClause}
      UNION ALL
      SELECT 
        'error' as type,
        error_id as id,
        session_id,
        timestamp,
        '{"message":"' || message || '","type":"' || type || '","stackTrace":' || COALESCE('"' || stack_trace || '"', 'null') || '}' as data
      FROM errors
      ${whereClause}
    )
    ORDER BY timestamp DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  
  // Get total count
  const countQuery = `
    SELECT 
      (SELECT COUNT(*) FROM events ${whereClause}) + 
      (SELECT COUNT(*) FROM errors ${whereClause}) as count
  `;
  
  const [activities, countResult] = await Promise.all([
    executeQuery<ActivityQueryResult>(activitiesQuery),
    executeQuery<{ count: number }>(countQuery),
  ]);
  
  return {
    activities,
    total: countResult[0]?.count || 0,
  };
}

// Initialize QuestDB tables if they don't exist
export async function initQuestDB(): Promise<void> {
  if (tablesInitialized) {
    console.log('[QuestDB] Tables already initialized, skipping...');
    return;
  }

  const url = `${QUESTDB_HTTP_URL}/exec`;
  const auth = Buffer.from(`${QUESTDB_USER}:${QUESTDB_PASSWORD}`).toString('base64');

  try {
    // Create events table
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

    // Create errors table
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
    throw error;
  }
}
