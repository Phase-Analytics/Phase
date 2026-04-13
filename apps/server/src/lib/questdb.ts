import { decodeTime } from 'ulid';
import {
  QUESTDB_EVENT_READ_TABLES,
  QUESTDB_EVENT_WRITE_TABLE,
  QUESTDB_LEGACY_EVENT_TABLE,
} from './questdb-events';

const QUESTDB_HTTP = 'http://questdb:9000';
const EVENT_TIMESTAMP_FORMAT = 'yyyy-MM-ddTHH:mm:ss.SSSUUUZ';
const QUESTDB_EVENT_WRITE_PARTITION = 'MONTH';
const QUESTDB_EVENT_CUTOVER_AT = '2026-04-13T09:33:17Z';
const QUESTDB_EVENT_CUTOVER_AT_MS = new Date(
  QUESTDB_EVENT_CUTOVER_AT
).getTime();

let tablesInitialized = false;
let initPromise: Promise<void> | null = null;
let eventSchemaVerified = false;
let eventSchemaError: string | null = null;

const IDENTIFIER_REGEX = /^[a-zA-Z0-9_-]+$/;
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally checking for control characters
const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/;

type QueryResponse = {
  query: string;
  columns?: Array<{ name: string; type: string }>;
  dataset?: unknown[][];
  count: number;
  error?: string;
  position?: number;
  timings: {
    compiler: number;
    count: number;
    execute: number;
  };
};

type QuestDBTableMetadata = {
  table_name: string;
  designatedTimestamp: string | null;
  partitionBy: string | null;
  walEnabled: boolean;
  dedup: boolean;
  ttlValue: number | null;
  ttlUnit: string | null;
};

type QuestDBTableColumnMetadata = {
  column: string;
  type: string;
  indexed: boolean;
  designated: boolean;
  upsertKey: boolean;
};

type QuestDBEventTableAggregate = {
  count: number;
  min_timestamp: string | null;
  max_timestamp: string | null;
};

export type QuestDBEventTableDiagnostics = {
  tableName: string;
  rowCount: number;
  minTimestamp: string | null;
  maxTimestamp: string | null;
  partitionBy: string | null;
  walEnabled: boolean;
  dedup: boolean;
  ttlValue: number | null;
  ttlUnit: string | null;
};

export type QuestDBEventStorageDiagnostics = {
  readTables: string[];
  writeTable: string;
  schemaVerified: boolean;
  schemaError: string | null;
  tables: QuestDBEventTableDiagnostics[];
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

function validateTableName(tableName: string): string {
  validateIdentifier(tableName, 'table name');
  return tableName;
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

  if (result.error) {
    throw new Error(
      `QuestDB query error: ${result.error}${result.position !== undefined ? ` at position ${result.position}` : ''}`
    );
  }

  const columns = result.columns ?? [];
  const dataset = result.dataset ?? [];

  return dataset.map((row) => {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < columns.length; i++) {
      obj[columns[i].name] = row[i];
    }
    return obj as T;
  });
}

async function executeStatement(query: string): Promise<void> {
  await executeQuery(query);
}

function createEventTableQuery(
  tableName: string,
  partitionBy: 'DAY' | 'MONTH'
): string {
  return `
    CREATE TABLE IF NOT EXISTS ${validateTableName(tableName)} (
      event_id VARCHAR,
      session_id SYMBOL INDEX,
      device_id SYMBOL INDEX,
      app_id SYMBOL INDEX,
      name SYMBOL,
      params VARCHAR,
      is_screen BOOLEAN,
      is_debug BOOLEAN,
      timestamp TIMESTAMP
    ) TIMESTAMP(timestamp) PARTITION BY ${partitionBy} WAL DEDUP UPSERT KEYS(timestamp, event_id)
  `;
}

function buildWhereClause(conditions: string[]): string {
  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
}

function normalizeTimeToMs(value: string | Date | undefined): number | null {
  if (!value) {
    return null;
  }

  const timeMs =
    value instanceof Date ? value.getTime() : new Date(value).getTime();

  return Number.isNaN(timeMs) ? null : timeMs;
}

function resolveReadTablesForRange(options: {
  startDate?: string | Date;
  endDate?: string | Date;
}): string[] {
  if (QUESTDB_LEGACY_EVENT_TABLE === QUESTDB_EVENT_WRITE_TABLE) {
    return QUESTDB_EVENT_READ_TABLES;
  }

  const startTimeMs = normalizeTimeToMs(options.startDate);
  const endTimeMs = normalizeTimeToMs(options.endDate);

  if (endTimeMs !== null && endTimeMs < QUESTDB_EVENT_CUTOVER_AT_MS) {
    return [QUESTDB_LEGACY_EVENT_TABLE];
  }

  if (startTimeMs !== null && startTimeMs >= QUESTDB_EVENT_CUTOVER_AT_MS) {
    return [QUESTDB_EVENT_WRITE_TABLE];
  }

  return QUESTDB_EVENT_READ_TABLES;
}

function resolveReadTablesForEventId(eventId: string): string[] {
  if (QUESTDB_LEGACY_EVENT_TABLE === QUESTDB_EVENT_WRITE_TABLE) {
    return QUESTDB_EVENT_READ_TABLES;
  }

  try {
    return decodeTime(eventId) >= QUESTDB_EVENT_CUTOVER_AT_MS
      ? [QUESTDB_EVENT_WRITE_TABLE]
      : [QUESTDB_LEGACY_EVENT_TABLE];
  } catch {
    return QUESTDB_EVENT_READ_TABLES;
  }
}

function buildEventReadUnion(
  selectClause: string,
  conditions: string[] = [],
  tableNames: string[] = QUESTDB_EVENT_READ_TABLES
): string {
  const whereClause = buildWhereClause(conditions);

  return tableNames
    .map(
      (tableName) => `
      SELECT ${selectClause}
      FROM ${validateTableName(tableName)}
      ${whereClause}
    `
    )
    .join('\n      UNION ALL\n');
}

function createEventListRowSelectClause(): string {
  return `
    CAST(event_id AS VARCHAR) AS event_id,
    CAST(device_id AS VARCHAR) AS device_id,
    CAST(name AS VARCHAR) AS name,
    is_screen,
    COALESCE(is_debug, false) AS is_debug,
    timestamp
  `;
}

function createEventDetailRowSelectClause(): string {
  return `
    CAST(event_id AS VARCHAR) AS event_id,
    CAST(session_id AS VARCHAR) AS session_id,
    CAST(device_id AS VARCHAR) AS device_id,
    CAST(name AS VARCHAR) AS name,
    CAST(params AS VARCHAR) AS params,
    is_screen,
    COALESCE(is_debug, false) AS is_debug,
    timestamp
  `;
}

function isOneYearTtl(
  ttlValue: number | null | undefined,
  ttlUnit: string | null | undefined
): boolean {
  const normalizedUnit = ttlUnit?.toUpperCase();

  return (
    (ttlValue === 1 && normalizedUnit === 'YEAR') ||
    (ttlValue === 12 && normalizedUnit === 'MONTH')
  );
}

async function getTableMetadata(
  tableName: string
): Promise<QuestDBTableMetadata | null> {
  const query = `
    SELECT table_name, designatedTimestamp, partitionBy, walEnabled, dedup, ttlValue, ttlUnit
    FROM tables()
    WHERE table_name = '${escapeSqlString(tableName)}'
  `;

  const [table] = await executeQuery<QuestDBTableMetadata>(query);
  return table ?? null;
}

async function getTableColumns(
  tableName: string
): Promise<QuestDBTableColumnMetadata[]> {
  return await executeQuery<QuestDBTableColumnMetadata>(`
    SELECT "column", type, indexed, designated, upsertKey
    FROM table_columns('${escapeSqlString(tableName)}')
  `);
}

function assertTableTtl(
  tableName: string,
  metadata: QuestDBTableMetadata | null
): void {
  if (!metadata) {
    throw new Error(`[QuestDB] Missing expected table: ${tableName}`);
  }

  if (!isOneYearTtl(metadata.ttlValue, metadata.ttlUnit)) {
    throw new Error(
      `[QuestDB] ${tableName} ttl mismatch. Expected 1 YEAR, got ${metadata.ttlValue ?? 'null'} ${metadata.ttlUnit ?? 'null'}`
    );
  }
}

async function verifyWriteTableSchema(tableName: string): Promise<void> {
  const metadata = await getTableMetadata(tableName);
  assertTableTtl(tableName, metadata);

  if (metadata?.partitionBy !== QUESTDB_EVENT_WRITE_PARTITION) {
    throw new Error(
      `[QuestDB] ${tableName} partitioning mismatch. Expected ${QUESTDB_EVENT_WRITE_PARTITION}, got ${metadata?.partitionBy ?? 'null'}`
    );
  }

  if (metadata?.designatedTimestamp !== 'timestamp') {
    throw new Error(
      `[QuestDB] ${tableName} designated timestamp mismatch. Expected timestamp, got ${metadata?.designatedTimestamp ?? 'null'}`
    );
  }

  if (!metadata.walEnabled) {
    throw new Error(`[QuestDB] ${tableName} must have WAL enabled`);
  }

  if (!metadata.dedup) {
    throw new Error(`[QuestDB] ${tableName} must have deduplication enabled`);
  }

  const columns = await getTableColumns(tableName);
  const columnMap = new Map(columns.map((column) => [column.column, column]));

  const requiredColumns: Record<
    string,
    {
      type: string;
      indexed?: boolean;
      designated?: boolean;
      upsertKey?: boolean;
    }
  > = {
    event_id: { type: 'VARCHAR', upsertKey: true },
    session_id: { type: 'SYMBOL', indexed: true },
    device_id: { type: 'SYMBOL', indexed: true },
    app_id: { type: 'SYMBOL', indexed: true },
    name: { type: 'SYMBOL', indexed: false },
    params: { type: 'VARCHAR' },
    is_screen: { type: 'BOOLEAN' },
    is_debug: { type: 'BOOLEAN' },
    timestamp: { type: 'TIMESTAMP', designated: true, upsertKey: true },
  };

  for (const [columnName, expected] of Object.entries(requiredColumns)) {
    const actual = columnMap.get(columnName);

    if (!actual) {
      throw new Error(`[QuestDB] ${tableName} is missing column ${columnName}`);
    }

    if (actual.type !== expected.type) {
      throw new Error(
        `[QuestDB] ${tableName}.${columnName} type mismatch. Expected ${expected.type}, got ${actual.type}`
      );
    }

    if (
      expected.indexed !== undefined &&
      Boolean(actual.indexed) !== expected.indexed
    ) {
      throw new Error(
        `[QuestDB] ${tableName}.${columnName} index mismatch. Expected ${expected.indexed}, got ${Boolean(actual.indexed)}`
      );
    }

    if (
      expected.designated !== undefined &&
      Boolean(actual.designated) !== expected.designated
    ) {
      throw new Error(
        `[QuestDB] ${tableName}.${columnName} designated mismatch. Expected ${expected.designated}, got ${Boolean(actual.designated)}`
      );
    }

    if (
      expected.upsertKey !== undefined &&
      Boolean(actual.upsertKey) !== expected.upsertKey
    ) {
      throw new Error(
        `[QuestDB] ${tableName}.${columnName} upsert key mismatch. Expected ${expected.upsertKey}, got ${Boolean(actual.upsertKey)}`
      );
    }
  }
}

async function getEventCount(
  conditions: string[] = [],
  tableNames: string[] = QUESTDB_EVENT_READ_TABLES
): Promise<number> {
  const [result] = await executeQuery<{ count: number }>(`
    SELECT COUNT(*) AS count
    FROM (
      ${buildEventReadUnion('1 AS row_marker', conditions, tableNames)}
    ) event_rows
  `);

  return Number(result?.count ?? 0);
}

export type EventQueryResult = {
  event_id: string;
  device_id: string;
  name: string;
  is_screen: boolean;
  is_debug: boolean | null;
  timestamp: string;
};

export type EventDetailResult = {
  event_id: string;
  session_id: string;
  device_id: string;
  name: string;
  params: string | null;
  is_screen: boolean;
  is_debug: boolean | null;
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

  const readTables = resolveReadTablesForRange({
    startDate: options.startDate,
    endDate: options.endDate,
  });
  const limit = sanitizeNumeric(options.limit, 10, 1, 1000);
  const offset = sanitizeNumeric(options.offset, 0, 0, 1_000_000);
  const limitClause =
    offset > 0 ? `LIMIT ${offset},${offset + limit}` : `LIMIT ${limit}`;

  const eventsQuery = `
    SELECT
      event_id,
      session_id,
      device_id,
      name,
      params,
      is_screen,
      is_debug,
      to_str(timestamp, '${EVENT_TIMESTAMP_FORMAT}') AS timestamp
    FROM (
      ${buildEventReadUnion(createEventListRowSelectClause(), conditions, readTables)}
    ) event_rows
    ORDER BY timestamp DESC
    ${limitClause}
  `;

  const [events, total] = await Promise.all([
    executeQuery<EventQueryResult>(eventsQuery),
    getEventCount(conditions, readTables),
  ]);

  return {
    events,
    total,
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

async function queryTopEventsByType(
  options: GetTopEventsOptions,
  isScreen: boolean
): Promise<TopEventQueryResult[]> {
  validateIdentifier(options.appId, 'appId');

  const conditions: string[] = [
    `app_id = '${escapeSqlString(options.appId)}'`,
    `is_screen = ${isScreen}`,
  ];

  if (options.startDate) {
    validateTimestamp(options.startDate, 'startDate');
    conditions.push(`timestamp >= '${escapeSqlString(options.startDate)}'`);
  }

  if (options.endDate) {
    validateTimestamp(options.endDate, 'endDate');
    conditions.push(`timestamp <= '${escapeSqlString(options.endDate)}'`);
  }

  const readTables = resolveReadTablesForRange({
    startDate: options.startDate,
    endDate: options.endDate,
  });
  const limit = sanitizeNumeric(options.limit, 10, 1, 10);

  const query = `
    SELECT name, COUNT(*) AS count
    FROM (
      ${buildEventReadUnion('CAST(name AS VARCHAR) AS name', conditions, readTables)}
    ) event_rows
    GROUP BY name
    ORDER BY count DESC
    LIMIT ${limit}
  `;

  return await executeQuery<TopEventQueryResult>(query);
}

export async function getTopEvents(
  options: GetTopEventsOptions
): Promise<{ events: TopEventQueryResult[]; screens: TopEventQueryResult[] }> {
  const [events, screens] = await Promise.all([
    queryTopEventsByType(options, false),
    queryTopEventsByType(options, true),
  ]);

  return { events, screens };
}

export async function getTopScreens(
  options: GetTopEventsOptions
): Promise<TopEventQueryResult[]> {
  return await queryTopEventsByType(options, true);
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

  const readTables = resolveReadTablesForEventId(options.eventId);

  const query = `
    SELECT
      event_id,
      session_id,
      device_id,
      name,
      params,
      is_screen,
      is_debug,
      to_str(timestamp, '${EVENT_TIMESTAMP_FORMAT}') AS timestamp
    FROM (
      ${buildEventReadUnion(
        createEventDetailRowSelectClause(),
        [
          `event_id = '${escapeSqlString(options.eventId)}'`,
          `app_id = '${escapeSqlString(options.appId)}'`,
        ],
        readTables
      )}
    ) event_rows
    ORDER BY timestamp DESC
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
  const twentyFourHoursAgoDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fortyEightHoursAgoDate = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const twentyFourHoursAgo = twentyFourHoursAgoDate.getTime() * 1000;
  const fortyEightHoursAgo = fortyEightHoursAgoDate.getTime() * 1000;

  const appCondition = `app_id = '${escapeSqlString(options.appId)}'`;

  const [totalEvents, totalEventsYesterday, events24h, eventsYesterday] =
    await Promise.all([
      getEventCount([appCondition]),
      getEventCount(
        [appCondition, `timestamp < ${twentyFourHoursAgo}`],
        resolveReadTablesForRange({ endDate: twentyFourHoursAgoDate })
      ),
      getEventCount(
        [appCondition, `timestamp >= ${twentyFourHoursAgo}`],
        resolveReadTablesForRange({ startDate: twentyFourHoursAgoDate })
      ),
      getEventCount(
        [
          appCondition,
          `timestamp >= ${fortyEightHoursAgo}`,
          `timestamp < ${twentyFourHoursAgo}`,
        ],
        resolveReadTablesForRange({
          startDate: fortyEightHoursAgoDate,
          endDate: twentyFourHoursAgoDate,
        })
      ),
    ]);

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
    try {
      eventSchemaVerified = false;
      eventSchemaError = null;

      console.log(
        `[QuestDB] Event storage config. write=${QUESTDB_EVENT_WRITE_TABLE} read=${QUESTDB_EVENT_READ_TABLES.join(',')} cutover=${QUESTDB_EVENT_CUTOVER_AT}`
      );

      for (const tableName of QUESTDB_EVENT_READ_TABLES) {
        await executeStatement(
          createEventTableQuery(
            tableName,
            tableName === QUESTDB_EVENT_WRITE_TABLE
              ? QUESTDB_EVENT_WRITE_PARTITION
              : 'DAY'
          )
        );
        await executeStatement(
          `ALTER TABLE ${validateTableName(tableName)} ADD COLUMN IF NOT EXISTS is_debug BOOLEAN`
        );
        await executeStatement(
          `ALTER TABLE ${validateTableName(tableName)} SET TTL 1 YEAR`
        );
      }

      for (const tableName of QUESTDB_EVENT_READ_TABLES) {
        const metadata = await getTableMetadata(tableName);
        assertTableTtl(tableName, metadata);
      }

      await verifyWriteTableSchema(QUESTDB_EVENT_WRITE_TABLE);

      eventSchemaVerified = true;
      tablesInitialized = true;
      console.log(
        `[QuestDB] Event storage initialized. write=${QUESTDB_EVENT_WRITE_TABLE} read=${QUESTDB_EVENT_READ_TABLES.join(',')} cutover=${QUESTDB_EVENT_CUTOVER_AT} schema=ok retention=1y`
      );
    } catch (error) {
      eventSchemaVerified = false;
      eventSchemaError =
        error instanceof Error ? error.message : 'Unknown schema error';
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
  const readTables = resolveReadTablesForRange({
    startDate: start,
    endDate: end,
  });

  const query = `
    SELECT
      to_str(timestamp, 'yyyy-MM-dd') AS date,
      COUNT(*) AS count
    FROM (
      ${buildEventReadUnion(
        'timestamp',
        [
          `app_id = '${escapeSqlString(options.appId)}'`,
          `timestamp >= ${startTimestamp}`,
          `timestamp < ${endTimestamp}`,
        ],
        readTables
      )}
    ) event_rows
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

export async function getTotalEventCount(): Promise<number> {
  return await getEventCount();
}

export async function getQuestDBEventStorageDiagnostics(): Promise<QuestDBEventStorageDiagnostics> {
  const tables = await Promise.all(
    QUESTDB_EVENT_READ_TABLES.map(async (tableName) => {
      const [metadata, aggregate] = await Promise.all([
        getTableMetadata(tableName),
        executeQuery<QuestDBEventTableAggregate>(`
          SELECT
            COUNT(*) AS count,
            to_str(min(timestamp), '${EVENT_TIMESTAMP_FORMAT}') AS min_timestamp,
            to_str(max(timestamp), '${EVENT_TIMESTAMP_FORMAT}') AS max_timestamp
          FROM ${validateTableName(tableName)}
        `),
      ]);

      const stats = aggregate[0];

      return {
        tableName,
        rowCount: Number(stats?.count ?? 0),
        minTimestamp: stats?.min_timestamp ?? null,
        maxTimestamp: stats?.max_timestamp ?? null,
        partitionBy: metadata?.partitionBy ?? null,
        walEnabled: metadata?.walEnabled ?? false,
        dedup: metadata?.dedup ?? false,
        ttlValue: metadata?.ttlValue ?? null,
        ttlUnit: metadata?.ttlUnit ?? null,
      } satisfies QuestDBEventTableDiagnostics;
    })
  );

  return {
    readTables: [...QUESTDB_EVENT_READ_TABLES],
    writeTable: QUESTDB_EVENT_WRITE_TABLE,
    schemaVerified: eventSchemaVerified,
    schemaError: eventSchemaError,
    tables,
  };
}

export async function closeQuestDB(): Promise<void> {
  // No-op: HTTP doesn't need cleanup
}
