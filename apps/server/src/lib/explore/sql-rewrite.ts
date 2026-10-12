import { buildResolveDeviceModelSql } from '@phase/shared';
import type { Select } from 'node-sql-parser';
import { buildExploreEventsSubquery } from '@/lib/questdb';
import { escapeQuestDbString } from '@/lib/questdb-sql';
import {
  EXPLORE_TABLE_PLACEHOLDER_PREFIX,
  type ExploreVirtualTable,
} from './constants';
import { ExploreEngineError } from './errors';
import { inspectExploreAst } from './sql-guard';
import {
  EXPLORE_PARSER_OPTIONS,
  exploreSqlParser,
  type ParsedExploreSql,
} from './sql-validate';
import type { ExploreDateRange } from './time-range';

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
      locale,
      ${buildResolveDeviceModelSql('model')} AS model,
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

function buildEventsSubquery(context: RewriteContext): string {
  return `(${buildScopedEventsSubquery(
    context.appId,
    context.dateRange,
    `
          timestamp,
          CAST(device_id AS VARCHAR) AS user_id,
          CAST(name AS VARCHAR) AS name,
          CAST(params AS VARCHAR) AS params
        `
  )})`;
}

function buildScopedSubquery(
  table: ExploreVirtualTable,
  context: RewriteContext
): string {
  switch (table) {
    case 'events':
      return buildEventsSubquery(context);
    case 'users':
      return buildUsersSubquery(context.appId);
    case 'sessions':
      return buildSessionsSubquery(context.appId, context.dateRange);
    default:
      throw new ExploreEngineError('Unknown table.');
  }
}

function placeholderFor(table: ExploreVirtualTable): string {
  return `${EXPLORE_TABLE_PLACEHOLDER_PREFIX}${table}`;
}

/**
 * Regenerates SQL from the AST and requires the output to round-trip
 * unchanged, so the text handed to the database has the structure that was
 * validated.
 */
function sqlifyVerified(select: Select): string {
  const sql = exploreSqlParser.sqlify(select, EXPLORE_PARSER_OPTIONS);
  let reparsed: string;
  try {
    reparsed = exploreSqlParser.sqlify(
      exploreSqlParser.astify(sql, EXPLORE_PARSER_OPTIONS),
      EXPLORE_PARSER_OPTIONS
    );
  } catch {
    throw new ExploreEngineError('Query could not be scoped safely.');
  }
  if (reparsed !== sql) {
    throw new ExploreEngineError('Query could not be scoped safely.');
  }
  return sql;
}

/**
 * Replaces every virtual table node in the validated AST with an app-scoped
 * subquery. Fails closed unless each table reference was substituted exactly
 * once.
 */
export function rewriteExploreSql(
  parsed: ParsedExploreSql,
  context: RewriteContext
): { sql: string; target: 'questdb' | 'postgres' } {
  const select = structuredClone(parsed.select);
  const { tables, tableRefs } = inspectExploreAst(select);

  if (tableRefs.length === 0) {
    throw new ExploreEngineError(
      'Query must reference at least one table: events, users, or sessions.'
    );
  }

  for (const ref of tableRefs) {
    const table = ref.table.toLowerCase() as ExploreVirtualTable;
    ref.as ??= table;
    ref.table = placeholderFor(table);
  }

  let sql = sqlifyVerified(select);
  let replaced = 0;

  for (const table of tables) {
    const parts = sql.split(`"${placeholderFor(table)}"`);
    replaced += parts.length - 1;
    sql = parts.join(buildScopedSubquery(table, context));
  }

  if (
    replaced !== tableRefs.length ||
    sql.includes(EXPLORE_TABLE_PLACEHOLDER_PREFIX)
  ) {
    throw new ExploreEngineError('Query could not be scoped safely.');
  }

  return { sql, target: tables.has('events') ? 'questdb' : 'postgres' };
}
