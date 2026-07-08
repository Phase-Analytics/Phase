import type { ExploreRunResponse, ExploreSqlQuery } from '@phase/shared';
import {
  executePostgresExploreQuery,
  executeQuestDbExploreQuery,
  rewriteExploreSql,
} from './sql-execute';
import {
  applyExplorePagination,
  parseExploreSql,
  validateExplorePage,
} from './sql-validate';
import { resolveExploreDateRangeForSql } from './time-range';

function normalizeResultColumns(columns: string[]): string[] {
  return columns.map((column) => (column === 'device_id' ? 'user_id' : column));
}

export type ExploreRunOptions = {
  maxPageSize?: number;
};

export async function runExploreQuery(
  appId: string,
  query: ExploreSqlQuery,
  page = 1,
  options?: ExploreRunOptions
): Promise<ExploreRunResponse> {
  const startedAt = Date.now();
  const dateRange = resolveExploreDateRangeForSql(query.sql);
  const parsed = parseExploreSql(query.sql);
  const pageSize = options?.maxPageSize
    ? Math.min(parsed.pageSize, options.maxPageSize)
    : parsed.pageSize;

  validateExplorePage(page, pageSize);

  const usesEvents = parsed.tables.has('events');
  const usesPostgresTables =
    parsed.tables.has('users') || parsed.tables.has('sessions');
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
    pageSize,
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

  const hasNextPage = result.rows.length > pageSize;
  const pageRows = hasNextPage ? result.rows.slice(0, pageSize) : result.rows;
  const columns = normalizeResultColumns(result.columns);

  return {
    result: {
      kind: 'table',
      columns,
      rows: pageRows,
    },
    meta: {
      generatedAt: new Date().toISOString(),
      page,
      pageSize,
      offset,
      rowCount: pageRows.length,
      hasNextPage,
      hasPreviousPage: page > 1,
      executionMs: Date.now() - startedAt,
      appliedDateRange: dateRange,
    },
  };
}
