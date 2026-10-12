import { QUESTDB_EVENT_READ_TABLES } from './questdb-events';
import { assertQuestDbIdentifier, escapeQuestDbString } from './questdb-sql';

const QUESTDB_HTTP = 'http://questdb:9000';
const QUESTDB_READ_TIMEOUT_MS = 30_000;

export const EVENT_TIMESTAMP_FORMAT = 'yyyy-MM-ddTHH:mm:ss.SSSUUUZ';

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

export function escapeSqlString(value: string): string {
  return escapeQuestDbString(value);
}

export function validateIdentifier(value: string, fieldName: string): void {
  assertQuestDbIdentifier(value, fieldName);
}

export function validateTableName(tableName: string): string {
  validateIdentifier(tableName, 'table name');
  return tableName;
}

export function validateSymbol(value: string, fieldName: string): void {
  if (value.length > 256) {
    throw new Error(`Invalid ${fieldName}: exceeds maximum length of 256`);
  }
  if (CONTROL_CHARS_REGEX.test(value)) {
    throw new Error(`Invalid ${fieldName}: contains control characters`);
  }
}

export function validateTimestamp(value: string, fieldName: string): void {
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

export function sanitizeNumeric(
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

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.name === 'TimeoutError';
}

/**
 * Runs a query over QuestDB's HTTP API. Reads are aborted after 30s; schema
 * statements pass `timeoutMs: null` so slow DDL is not cut off mid-flight.
 */
export async function executeQuery<T>(
  query: string,
  options: { timeoutMs?: number | null } = {}
): Promise<T[]> {
  const timeoutMs =
    options.timeoutMs === undefined ? QUESTDB_READ_TIMEOUT_MS : options.timeoutMs;

  let response: Response;
  try {
    response = await fetch(
      `${QUESTDB_HTTP}/exec?query=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: timeoutMs === null ? undefined : AbortSignal.timeout(timeoutMs),
      }
    );
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error(`QuestDB query timed out after ${timeoutMs}ms`);
    }
    throw error;
  }

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

export async function executeStatement(query: string): Promise<void> {
  await executeQuery(query, { timeoutMs: null });
}

export function buildWhereClause(conditions: string[]): string {
  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
}

export function withoutDebugData(
  conditions: string[],
  includeDebugData: boolean
): string[] {
  return includeDebugData
    ? conditions
    : [...conditions, 'COALESCE(is_debug, false) = false'];
}

/**
 * One SELECT per event storage table joined with UNION ALL. `branchSuffix` is
 * appended to every branch (e.g. SAMPLE BY, ORDER BY ... LIMIT); branches with
 * a suffix are wrapped so QuestDB accepts per-branch ordering.
 */
export function buildEventReadUnion(
  selectClause: string,
  conditions: string[] = [],
  tableNames: string[] = QUESTDB_EVENT_READ_TABLES,
  includeDebugData = false,
  branchSuffix = ''
): string {
  const whereClause = buildWhereClause(
    withoutDebugData(conditions, includeDebugData)
  );

  return tableNames
    .map((tableName) => {
      const branch = `
      SELECT ${selectClause}
      FROM ${validateTableName(tableName)}
      ${whereClause}
      ${branchSuffix}
    `;
      return branchSuffix ? `SELECT * FROM (${branch})` : branch;
    })
    .join('\n      UNION ALL\n');
}
