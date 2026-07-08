import { buildExploreEventsSubquery } from '@/lib/questdb';
import { escapeQuestDbString } from '@/lib/questdb-sql';
import type { ExploreVirtualTable } from './constants';
import type { ExploreDateRange } from './time-range';

const WHITESPACE_SPLIT_PATTERN = /\s+/;

type RewriteContext = {
  appId: string;
  dateRange: ExploreDateRange | null;
};

function escapePgString(value: string): string {
  return value.replace(/'/g, "''");
}

export function buildScopedEventsSubquery(
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function virtualTablePattern(tableName: string): string {
  const escaped = escapeRegExp(tableName);
  return `(?:"${escaped}"|${escaped})`;
}

function replaceTableReference(
  sql: string,
  tableName: ExploreVirtualTable | 'explore_staged_events',
  replacement: string
): string {
  const table = virtualTablePattern(tableName);
  const patterns = [
    new RegExp(`\\bFROM\\s+${table}(?=\\s|,|$)`, 'gi'),
    new RegExp(`\\bJOIN\\s+${table}(?=\\s|,|$)`, 'gi'),
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
