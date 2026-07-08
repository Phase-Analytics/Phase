import { pool } from '@/db';
import { executeQuestDBReadQuery } from '@/lib/questdb';
import { EXPLORE_MAX_STAGED_EVENTS } from './constants';
import { ExploreEngineError } from './errors';
import { buildScopedEventsSubquery } from './sql-rewrite';
import type { ExploreDateRange } from './time-range';

export { rewriteExploreSql } from './sql-rewrite';

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
