import { type AST, Parser, type Select } from 'node-sql-parser';
import {
  EXPLORE_DEFAULT_PAGE_SIZE,
  EXPLORE_MAX_OFFSET,
  EXPLORE_MAX_PAGE_SIZE,
  EXPLORE_MAX_SQL_LENGTH,
  EXPLORE_TABLE_PLACEHOLDER_PREFIX,
  type ExploreVirtualTable,
  FORBIDDEN_SQL_KEYWORDS,
} from './constants';
import { ExploreEngineError } from './errors';
import { inspectExploreAst } from './sql-guard';
import { assertSafeSqlLexemes, mapSqlCode } from './sql-lexer';

export const exploreSqlParser = new Parser();

export const EXPLORE_PARSER_OPTIONS = { database: 'Postgresql' as const };

const LEGACY_DEVICES_TABLE_PATTERN = /\bdevices\b/i;
const LEGACY_DEVICE_ID_COLUMN_PATTERN = /\bdevice_id\b/i;
const JOIN_PATTERN = /\b(?:inner\s+|left\s+|right\s+|full\s+|cross\s+)?join\b/i;

const ALLOWED_STATEMENT_TYPES = new Set(['select']);

function assertSelectStatement(ast: AST | AST[]): Select {
  const statements = Array.isArray(ast) ? ast : [ast];

  if (statements.length !== 1) {
    throw new ExploreEngineError('Only a single SELECT statement is allowed.');
  }

  const statement = statements[0];
  if (!(statement && ALLOWED_STATEMENT_TYPES.has(statement.type))) {
    throw new ExploreEngineError('Only SELECT queries are allowed.');
  }

  return statement as Select;
}

function assertNoOuterLimit(select: Select): void {
  const values = (select.limit as { value?: unknown[] } | null)?.value;
  if (Array.isArray(values) && values.length > 0) {
    throw new ExploreEngineError(
      'LIMIT must be a plain number at the end of the query. OFFSET is not allowed.'
    );
  }
}

function assertUserFacingIdentifiers(sql: string): void {
  if (LEGACY_DEVICES_TABLE_PATTERN.test(sql)) {
    throw new ExploreEngineError('Use the users table instead of devices.');
  }

  if (LEGACY_DEVICE_ID_COLUMN_PATTERN.test(sql)) {
    throw new ExploreEngineError('Use user_id instead of device_id.');
  }

  if (sql.toLowerCase().includes(EXPLORE_TABLE_PLACEHOLDER_PREFIX)) {
    throw new ExploreEngineError('Query contains a reserved identifier.');
  }
}

function assertNoJoins(sql: string): void {
  if (JOIN_PATTERN.test(sql)) {
    throw new ExploreEngineError(
      'JOINs are not supported. Query one table at a time: events, users, or sessions.'
    );
  }
}

function assertSingleTable(tables: Set<ExploreVirtualTable>): void {
  if (tables.size > 1) {
    const names = [...tables].sort().join(', ');
    throw new ExploreEngineError(
      `Multi-table queries are not supported (${names}). Query one table at a time: events, users, or sessions.`
    );
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

function normalizeQuestDbCasts(code: string): string {
  return code
    .replace(/\bAS\s+long\b/gi, 'AS bigint')
    .replace(/\bAS\s+short\b/gi, 'AS smallint')
    .replace(/\bAS\s+byte\b/gi, 'AS smallint')
    .replace(/\bAS\s+symbol\b/gi, 'AS varchar')
    .replace(/\bAS\s+string\b/gi, 'AS varchar');
}

/** Maps QuestDB-only cast types to names both the parser and engines accept. */
function normalizeSqlForParser(sql: string): string {
  return mapSqlCode(sql, normalizeQuestDbCasts);
}

const TRAILING_LIMIT_OFFSET_PATTERN = /\blimit\s+(\d+)\s+offset\s+(\d+)\s*$/i;
const TRAILING_LIMIT_PATTERN = /\blimit\s+(\d+)\s*$/i;

export function stripTrailingLimit(sql: string): {
  sql: string;
  pageSize: number | null;
  hadOffset: boolean;
} {
  const offsetMatch = sql.match(TRAILING_LIMIT_OFFSET_PATTERN);
  if (offsetMatch) {
    const pageSize = Number.parseInt(offsetMatch[1] ?? '', 10);
    return {
      sql: sql.slice(0, offsetMatch.index).trimEnd(),
      pageSize: Number.isNaN(pageSize) ? null : pageSize,
      hadOffset: true,
    };
  }

  const limitMatch = sql.match(TRAILING_LIMIT_PATTERN);
  if (limitMatch) {
    const pageSize = Number.parseInt(limitMatch[1] ?? '', 10);
    return {
      sql: sql.slice(0, limitMatch.index).trimEnd(),
      pageSize: Number.isNaN(pageSize) ? null : pageSize,
      hadOffset: false,
    };
  }

  return { sql, pageSize: null, hadOffset: false };
}

export type ParsedExploreSql = {
  /** Validated SELECT AST without the trailing LIMIT. */
  select: Select;
  tables: Set<ExploreVirtualTable>;
  pageSize: number;
};

function astifyExploreSql(sql: string): AST | AST[] {
  try {
    return exploreSqlParser.astify(
      normalizeSqlForParser(sql),
      EXPLORE_PARSER_OPTIONS
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid SQL syntax.';
    throw new ExploreEngineError(message);
  }
}

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

  assertSafeSqlLexemes(trimmed);
  assertNoForbiddenKeywords(trimmed);
  assertUserFacingIdentifiers(trimmed);
  assertNoJoins(trimmed);

  const {
    sql: baseSql,
    pageSize: strippedLimit,
    hadOffset,
  } = stripTrailingLimit(trimmed);

  if (hadOffset) {
    throw new ExploreEngineError(
      'OFFSET is not allowed in queries. Use the page controls to navigate results.'
    );
  }

  if (strippedLimit !== null && strippedLimit > EXPLORE_MAX_PAGE_SIZE) {
    throw new ExploreEngineError(
      `LIMIT cannot exceed ${EXPLORE_MAX_PAGE_SIZE} rows per page.`
    );
  }

  const select = assertSelectStatement(astifyExploreSql(baseSql));
  assertNoOuterLimit(select);

  const { tables } = inspectExploreAst(select);

  if (tables.size === 0) {
    throw new ExploreEngineError(
      'Query must reference at least one table: events, users, or sessions.'
    );
  }

  assertSingleTable(tables);

  return {
    select,
    tables,
    pageSize: strippedLimit ?? EXPLORE_DEFAULT_PAGE_SIZE,
  };
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
