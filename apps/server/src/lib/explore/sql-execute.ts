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

type QuestDbExecResponse = {
  columns?: Array<{ name: string }>;
  dataset?: unknown[][];
  error?: string;
};

async function runQuestDbQuery(sql: string): Promise<ExploreQueryResult> {
  const response = await fetch(
    `http://questdb:9000/exec?query=${encodeURIComponent(sql)}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(EXPLORE_QUERY_TIMEOUT_MS),
    }
  );

  const text = await response.text();
  let result: QuestDbExecResponse | null = null;
  try {
    result = JSON.parse(text) as QuestDbExecResponse;
  } catch {
    result = null;
  }

  // QuestDB echoes the executed (rewritten) SQL and positions within it,
  // so only its error message is surfaced to the caller.
  if (result?.error) {
    throw new ExploreEngineError(`Query error: ${result.error}`);
  }
  if (!(response.ok && result)) {
    console.error(
      `[Explore] QuestDB returned HTTP ${response.status}:`,
      text.slice(0, 500)
    );
    throw new ExploreEngineError(EXPLORE_UNAVAILABLE_MESSAGE, 503);
  }

  const columns = (result.columns ?? []).map((column) => column.name);
  return { columns, rows: result.dataset ?? [] };
}

export async function executeQuestDbExploreQuery(
  sql: string
): Promise<ExploreQueryResult> {
  try {
    return await runQuestDbQuery(sql);
  } catch (error) {
    if (error instanceof ExploreEngineError) {
      throw error;
    }
    if (isTimeoutError(error)) {
      throw new ExploreEngineError(
        `Query timed out after ${EXPLORE_QUERY_TIMEOUT_MS / 1000} seconds. Narrow the time range or add filters.`
      );
    }
    console.error('[Explore] QuestDB request failed:', error);
    throw new ExploreEngineError(EXPLORE_UNAVAILABLE_MESSAGE, 503);
  }
}
