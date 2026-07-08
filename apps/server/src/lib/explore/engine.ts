import type {
  ExploreRunResponse,
  ExploreSqlQuery,
  ExploreTimeRange,
} from '@phase/shared';
import {
  executePostgresExploreQuery,
  executeQuestDbExploreQuery,
  rewriteExploreSql,
} from './sql-execute';
import { applyExplorePagination, parseExploreSql, validateExplorePage } from './sql-validate';
import { resolveExploreDateRange } from './time-range';

export async function runExploreQuery(
  appId: string,
  query: ExploreSqlQuery,
  timeRange: ExploreTimeRange,
  page = 1
): Promise<ExploreRunResponse> {
  const startedAt = Date.now();
  const dateRange = resolveExploreDateRange(timeRange);
  const parsed = parseExploreSql(query.sql);
  validateExplorePage(page, parsed.pageSize);

  const usesEvents = parsed.tables.has('events');
  const usesPostgresTables =
    parsed.tables.has('devices') || parsed.tables.has('sessions');
  const needsStaging = usesEvents && usesPostgresTables;

  const { sql: rewritten, target } = rewriteExploreSql(
    parsed.baseSql,
    parsed.tables,
    {
      appId,
      dateRange,
    },
    needsStaging
  );

  const { sql: paginatedSql, offset } = applyExplorePagination(
    rewritten,
    parsed.pageSize,
    page
  );

  const result =
    target === 'questdb'
      ? await executeQuestDbExploreQuery(paginatedSql)
      : await executePostgresExploreQuery(
          paginatedSql,
          needsStaging,
          appId,
          dateRange
        );

  const hasNextPage = result.rows.length > parsed.pageSize;
  const pageRows = hasNextPage
    ? result.rows.slice(0, parsed.pageSize)
    : result.rows;

  return {
    result: {
      kind: 'table',
      columns: result.columns,
      rows: pageRows,
    },
    meta: {
      generatedAt: new Date().toISOString(),
      page,
      pageSize: parsed.pageSize,
      offset,
      rowCount: pageRows.length,
      hasNextPage,
      hasPreviousPage: page > 1,
      executionMs: Date.now() - startedAt,
    },
  };
}
