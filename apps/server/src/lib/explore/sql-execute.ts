import { pool } from '@/db';
import {
  buildExploreEventsSubquery,
  executeQuestDBReadQuery,
} from '@/lib/questdb';
import { escapeQuestDbString } from '@/lib/questdb-sql';
import type { ExploreVirtualTable } from './constants';
import { EXPLORE_MAX_STAGED_EVENTS } from './constants';
import { ExploreEngineError } from './errors';
import type { ExploreDateRange } from './time-range';

const WHITESPACE_SPLIT_PATTERN = /\s+/;

type RewriteContext = {
  appId: string;
  dateRange: ExploreDateRange | null;
};

function escapePgString(value: string): string {
  return value.replace(/'/g, "''");
}

function buildScopedEventsSubquery(
  appId: string,
  dateRange: ExploreDateRange | null,
  selectClause: string
): string {
  const conditions = [
    `app_id = '${escapeQuestDbString(appId)}'`,
    'COALESCE(is_debug, false) = false',
  ];

  if (dateRange) {
    conditions.push(
      `timestamp >= '${escapeQuestDbString(dateRange.startDate)}'`,
      `timestamp <= '${escapeQuestDbString(dateRange.endDate)}'`
    );
  }

  return buildExploreEventsSubquery({
    selectClause,
    conditions,
    startDate: dateRange?.startDate,
    endDate: dateRange?.endDate,
  });
}

function buildUsersSubquery(appId: string): string {
  return `(
    SELECT
      device_id AS user_id,
      platform,
      country,
      city,
      locale,
      model,
      os_version,
      first_seen,
      properties
    FROM devices
    WHERE app_id = '${escapePgString(appId)}'
  )`;
}

function buildSessionsSubquery(
  appId: string,
  dateRange: ExploreDateRange | null
): string {
  const timeFilters = dateRange
    ? `AND s.started_at >= '${escapePgString(dateRange.startDate)}'::timestamptz
      AND s.started_at <= '${escapePgString(dateRange.endDate)}'::timestamptz`
    : '';

  return `(
    SELECT
      s.session_id,
      s.device_id AS user_id,
      s.started_at,
      s.last_activity_at,
      EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at))::double precision AS duration_seconds
    FROM sessions_analytics s
    INNER JOIN devices d ON d.device_id = s.device_id
    WHERE d.app_id = '${escapePgString(appId)}'
      ${timeFilters}
  )`;
}

function replaceTableReference(
  sql: string,
  tableName: ExploreVirtualTable | 'explore_staged_events',
  replacement: string
): string {
  const patterns = [
    new RegExp(`\\bFROM\\s+${tableName}\\b(?=\\s|$)`, 'gi'),
    new RegExp(`\\bJOIN\\s+${tableName}\\b`, 'gi'),
  ];

  let result = sql;
  for (const pattern of patterns) {
    result = result.replace(pattern, (match) => {
      const keyword = match.split(WHITESPACE_SPLIT_PATTERN)[0] ?? 'FROM';
      return `${keyword} ${replacement}`;
    });
  }
  return result;
}

export function rewriteExploreSql(
  sql: string,
  tables: Set<ExploreVirtualTable>,
  context: RewriteContext,
  stagedEventsTable = false
): { sql: string; target: 'questdb' | 'postgres' } {
  let rewritten = sql;
  const usesEvents = tables.has('events');
  const usesPostgresTables = tables.has('users') || tables.has('sessions');

  if (usesEvents && !stagedEventsTable) {
    if (usesPostgresTables) {
      rewritten = replaceTableReference(
        rewritten,
        'events',
        'explore_staged_events'
      );
    } else {
      const eventsSubquery = `(${buildScopedEventsSubquery(
        context.appId,
        context.dateRange,
        `
          timestamp,
          CAST(device_id AS VARCHAR) AS user_id,
          CAST(name AS VARCHAR) AS name,
          CAST(params AS VARCHAR) AS params
        `
      )})`;
      rewritten = replaceTableReference(rewritten, 'events', eventsSubquery);
    }
  }

  if (tables.has('users')) {
    rewritten = replaceTableReference(
      rewritten,
      'users',
      buildUsersSubquery(context.appId)
    );
  }

  if (tables.has('sessions')) {
    rewritten = replaceTableReference(
      rewritten,
      'sessions',
      buildSessionsSubquery(context.appId, context.dateRange)
    );
  }

  const target = usesEvents && !usesPostgresTables ? 'questdb' : 'postgres';

  return { sql: rewritten, target };
}

type StagedEventRow = {
  timestamp: string;
  user_id: string;
  name: string;
  params: string | null;
};

export async function stageEventsForPostgres(
  client: import('pg').PoolClient,
  appId: string,
  dateRange: ExploreDateRange | null
): Promise<void> {
  const fetchSql = `
    SELECT
      timestamp,
      user_id,
      name,
      params
    FROM (${buildScopedEventsSubquery(
      appId,
      dateRange,
      `
        to_str(timestamp, 'yyyy-MM-ddTHH:mm:ss.SSSUUUZ') AS timestamp,
        CAST(device_id AS VARCHAR) AS user_id,
        CAST(name AS VARCHAR) AS name,
        CAST(params AS VARCHAR) AS params
      `
    )})
    LIMIT ${EXPLORE_MAX_STAGED_EVENTS + 1}
  `;

  const rows = await executeQuestDBReadQuery<StagedEventRow>(fetchSql);

  if (rows.length > EXPLORE_MAX_STAGED_EVENTS) {
    throw new ExploreEngineError(
      `Too many events to stage (>${EXPLORE_MAX_STAGED_EVENTS.toLocaleString()}). Narrow your date range or add filters.`
    );
  }

  await client.query(`
    CREATE TEMP TABLE explore_staged_events (
      timestamp timestamptz,
      user_id text,
      name text,
      params text
    ) ON COMMIT DROP
  `);

  if (rows.length === 0) {
    return;
  }

  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    for (const row of batch) {
      values.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`
      );
      params.push(row.timestamp, row.user_id, row.name, row.params);
      paramIndex += 4;
    }

    await client.query(
      `INSERT INTO explore_staged_events (timestamp, user_id, name, params) VALUES ${values.join(', ')}`,
      params
    );
  }
}

export async function executePostgresExploreQuery(
  sql: string,
  needsStaging: boolean,
  appId: string,
  dateRange: ExploreDateRange | null
): Promise<{ columns: string[]; rows: unknown[][] }> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN READ ONLY');
    await client.query(`SET LOCAL statement_timeout = '30s'`);

    if (needsStaging) {
      await stageEventsForPostgres(client, appId, dateRange);
    }

    const result = await client.query(sql);
    const columns = result.fields.map((field) => field.name);
    const rows = result.rows.map((row) =>
      columns.map((column) => row[column] ?? null)
    );

    await client.query('COMMIT');
    return { columns, rows };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof ExploreEngineError) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : 'Query execution failed.';
    throw new ExploreEngineError(message);
  } finally {
    client.release();
  }
}

export async function executeQuestDbExploreQuery(
  sql: string
): Promise<{ columns: string[]; rows: unknown[][] }> {
  const response = await fetch(
    `http://questdb:9000/exec?query=${encodeURIComponent(sql)}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new ExploreEngineError(
      `Query execution failed: ${response.status} ${errorText}`
    );
  }

  const result = (await response.json()) as {
    columns?: Array<{ name: string }>;
    dataset?: unknown[][];
    error?: string;
    position?: number;
  };

  if (result.error) {
    throw new ExploreEngineError(
      `Query error: ${result.error}${result.position !== undefined ? ` at position ${result.position}` : ''}`
    );
  }

  const columns = (result.columns ?? []).map((column) => column.name);
  const rows = result.dataset ?? [];

  return { columns, rows };
}
