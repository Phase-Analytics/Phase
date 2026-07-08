import { type AST, Parser, type Select } from 'node-sql-parser';
import {
  EXPLORE_DEFAULT_PAGE_SIZE,
  EXPLORE_MAX_OFFSET,
  EXPLORE_MAX_PAGE_SIZE,
  EXPLORE_MAX_SQL_LENGTH,
  EXPLORE_VIRTUAL_TABLES,
  type ExploreVirtualTable,
  FORBIDDEN_SQL_KEYWORDS,
} from './constants';
import { ExploreEngineError } from './errors';

const parser = new Parser();

const PARSER_OPTIONS = { database: 'Postgresql' as const };

const LEGACY_DEVICES_TABLE_PATTERN = /\bdevices\b/i;
const LEGACY_DEVICE_ID_COLUMN_PATTERN = /\bdevice_id\b/i;

const ALLOWED_STATEMENT_TYPES = new Set(['select']);

function registerVirtualTable(
  tableName: string,
  tables: Set<ExploreVirtualTable>
): void {
  const name = tableName.toLowerCase();
  if (EXPLORE_VIRTUAL_TABLES.includes(name as ExploreVirtualTable)) {
    tables.add(name as ExploreVirtualTable);
    return;
  }
  if (!name.startsWith('explore_staged_')) {
    throw new ExploreEngineError(
      `Unknown table "${tableName}". Use events, users, or sessions.`
    );
  }
}

function collectTablesFromNode(
  node: unknown,
  tables: Set<ExploreVirtualTable>
): void {
  if (!node || typeof node !== 'object') {
    return;
  }

  const record = node as Record<string, unknown>;

  if (record.type === 'table' && typeof record.table === 'string') {
    registerVirtualTable(record.table, tables);
  } else if (
    typeof record.table === 'string' &&
    record.column === undefined &&
    record.type !== 'column_ref'
  ) {
    registerVirtualTable(record.table, tables);
  }

  for (const value of Object.values(record)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        collectTablesFromNode(item, tables);
      }
    } else if (value && typeof value === 'object') {
      collectTablesFromNode(value, tables);
    }
  }
}

function assertSelectStatement(ast: AST | AST[]): void {
  const statements = Array.isArray(ast) ? ast : [ast];

  if (statements.length !== 1) {
    throw new ExploreEngineError('Only a single SELECT statement is allowed.');
  }

  const statement = statements[0];
  if (!ALLOWED_STATEMENT_TYPES.has(statement.type)) {
    throw new ExploreEngineError('Only SELECT queries are allowed.');
  }
}

function assertUserFacingIdentifiers(sql: string): void {
  if (LEGACY_DEVICES_TABLE_PATTERN.test(sql)) {
    throw new ExploreEngineError('Use the users table instead of devices.');
  }

  if (LEGACY_DEVICE_ID_COLUMN_PATTERN.test(sql)) {
    throw new ExploreEngineError('Use user_id instead of device_id.');
  }
}

function assertNoForbiddenKeywords(sql: string): void {
  const upper = sql.toUpperCase();
  for (const keyword of FORBIDDEN_SQL_KEYWORDS) {
    const pattern = new RegExp(`\\b${keyword}\\b`);
    if (pattern.test(upper)) {
      throw new ExploreEngineError(
        `${keyword} statements are not allowed. Explore is read-only.`
      );
    }
  }
}

function extractLimitValue(limit: Select['limit']): number | null {
  if (!limit?.value) {
    return null;
  }

  const values = Array.isArray(limit.value) ? limit.value : [limit.value];
  const first = values[0];
  if (!first || first.type !== 'number') {
    return null;
  }

  const raw = first.value;
  if (typeof raw === 'number') {
    return raw;
  }
  if (typeof raw === 'string') {
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function assertNoUserOffset(select: Select): void {
  const limit = select.limit;
  if (!limit) {
    return;
  }

  const hasOffset =
    (limit as { offset?: unknown }).offset !== undefined ||
    limit.seperator === 'offset';

  if (hasOffset) {
    throw new ExploreEngineError(
      'OFFSET is not allowed in queries. Use the page controls to navigate results.'
    );
  }
}

function stripOuterLimit(select: Select): number | null {
  if (!select.limit) {
    return null;
  }

  const limitValue = extractLimitValue(select.limit);
  if (limitValue === null) {
    select.limit = null;
    return null;
  }

  assertNoUserOffset(select);

  if (limitValue > EXPLORE_MAX_PAGE_SIZE) {
    throw new ExploreEngineError(
      `LIMIT cannot exceed ${EXPLORE_MAX_PAGE_SIZE} rows per page.`
    );
  }

  select.limit = null;
  return limitValue;
}

export type ParsedExploreSql = {
  baseSql: string;
  tables: Set<ExploreVirtualTable>;
  pageSize: number;
};

export function parseExploreSql(sql: string): ParsedExploreSql {
  const trimmed = sql.trim();

  if (!trimmed) {
    throw new ExploreEngineError('SQL query is required.');
  }

  if (trimmed.length > EXPLORE_MAX_SQL_LENGTH) {
    throw new ExploreEngineError(
      `SQL query exceeds maximum length of ${EXPLORE_MAX_SQL_LENGTH} characters.`
    );
  }

  if (trimmed.includes(';')) {
    throw new ExploreEngineError(
      'Multiple statements are not allowed. Remove semicolons.'
    );
  }

  assertNoForbiddenKeywords(trimmed);
  assertUserFacingIdentifiers(trimmed);

  let ast: AST | AST[];
  try {
    ast = parser.astify(trimmed, PARSER_OPTIONS);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid SQL syntax.';
    throw new ExploreEngineError(message);
  }

  assertSelectStatement(ast);

  const select = (Array.isArray(ast) ? ast[0] : ast) as Select;
  const pageSizeFromQuery = stripOuterLimit(select);
  const pageSize = pageSizeFromQuery ?? EXPLORE_DEFAULT_PAGE_SIZE;

  const baseSql = parser.sqlify(select, PARSER_OPTIONS);

  const tables = new Set<ExploreVirtualTable>();
  collectTablesFromNode(select, tables);

  if (tables.size === 0) {
    throw new ExploreEngineError(
      'Query must reference at least one table: events, users, or sessions.'
    );
  }

  return { baseSql, tables, pageSize };
}

export type ExploreSqlDialect = 'postgres' | 'questdb';

export function applyExplorePagination(
  sql: string,
  pageSize: number,
  page: number,
  dialect: ExploreSqlDialect = 'postgres'
): { sql: string; offset: number; fetchSize: number } {
  const offset = (page - 1) * pageSize;
  const fetchSize = pageSize + 1;

  if (dialect === 'questdb') {
    const limitClause =
      offset === 0
        ? `LIMIT ${fetchSize}`
        : `LIMIT ${offset}, ${offset + fetchSize}`;
    return {
      sql: `${sql} ${limitClause}`,
      offset,
      fetchSize,
    };
  }

  return {
    sql: `${sql} LIMIT ${fetchSize} OFFSET ${offset}`,
    offset,
    fetchSize,
  };
}

export function validateExplorePage(page: number, pageSize: number): void {
  if (page < 1) {
    throw new ExploreEngineError('Page must be at least 1.');
  }

  const offset = (page - 1) * pageSize;
  if (offset > EXPLORE_MAX_OFFSET) {
    throw new ExploreEngineError(
      `Cannot skip more than ${EXPLORE_MAX_OFFSET.toLocaleString()} rows. Narrow filters or use a smaller page size.`
    );
  }
}
