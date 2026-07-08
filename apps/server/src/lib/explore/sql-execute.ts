import { pool } from '@/db';
import { ExploreEngineError } from './errors';

export { rewriteExploreSql } from './sql-rewrite';

export async function executePostgresExploreQuery(
  sql: string
): Promise<{ columns: string[]; rows: unknown[][] }> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN READ ONLY');
    await client.query(`SET LOCAL statement_timeout = '30s'`);

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
