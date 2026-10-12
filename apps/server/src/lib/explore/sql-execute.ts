import type { Pool, PoolClient } from 'pg';
import { getExplorePool } from '@/db/explore-pool';
import { ExploreEngineError } from './errors';

const EXPLORE_QUERY_TIMEOUT_MS = 30_000;
const EXPLORE_UNAVAILABLE_MESSAGE =
  'Query engine is temporarily unavailable. Try again shortly.';

type ExploreQueryResult = { columns: string[]; rows: unknown[][] };

async function acquireExploreClient(): Promise<PoolClient> {
  let explorePool: Pool;
  try {
    explorePool = await getExplorePool();
  } catch (error) {
    console.error('[Explore] Explore pool unavailable:', error);
    throw new ExploreEngineError(EXPLORE_UNAVAILABLE_MESSAGE, 503);
  }

  try {
    return await explorePool.connect();
  } catch (error) {
    console.error('[Explore] Failed to acquire explore connection:', error);
    throw new ExploreEngineError(EXPLORE_UNAVAILABLE_MESSAGE, 503);
  }
}

export async function executePostgresExploreQuery(
  sql: string
): Promise<ExploreQueryResult> {
  const client = await acquireExploreClient();
  let releaseError: Error | undefined;

  try {
    await client.query('BEGIN READ ONLY');
    await client.query(
      `SET LOCAL statement_timeout = '${EXPLORE_QUERY_TIMEOUT_MS}ms'`
    );

    const result = await client.query(sql);
    const columns = result.fields.map((field) => field.name);
    const rows = result.rows.map((row) =>
      columns.map((column) => row[column] ?? null)
    );

    await client.query('COMMIT');
    return { columns, rows };
  } catch (error) {
    await client.query('ROLLBACK').catch((rollbackError: Error) => {
      releaseError = rollbackError;
    });
    const message =
      error instanceof Error ? error.message : 'Query execution failed.';
    throw new ExploreEngineError(message);
  } finally {
    client.release(releaseError);
  }
}

function isTimeoutError(error: unknown): boolean {
  return (error as { name?: unknown } | null)?.name === 'TimeoutError';
}

async function runQuestDbQuery(sql: string): Promise<ExploreQueryResult> {
  const response = await fetch(
    `http://questdb:9000/exec?query=${encodeURIComponent(sql)}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(EXPLORE_QUERY_TIMEOUT_MS),
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

export async function executeQuestDbExploreQuery(
  sql: string
): Promise<ExploreQueryResult> {
  try {
    return await runQuestDbQuery(sql);
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new ExploreEngineError(
        `Query timed out after ${EXPLORE_QUERY_TIMEOUT_MS / 1000} seconds. Narrow the time range or add filters.`
      );
    }
    throw error;
  }
}
