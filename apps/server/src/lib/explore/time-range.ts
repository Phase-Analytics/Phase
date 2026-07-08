export const EXPLORE_DEFAULT_RANGE_DAYS = 30;

export type ExploreDateRange = {
  startDate: string;
  endDate: string;
};

export function resolveDefaultExploreDateRange(): ExploreDateRange {
  const now = new Date();
  const start = new Date(
    now.getTime() - EXPLORE_DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000
  );

  return {
    startDate: start.toISOString(),
    endDate: now.toISOString(),
  };
}

const EXPLICIT_TIME_FILTER_PATTERN =
  /\b(timestamp|started_at|last_activity_at|first_seen)\b\s*(>=|<=|>|<|=|between)/i;

export function sqlHasExplicitTimeFilter(sql: string): boolean {
  return EXPLICIT_TIME_FILTER_PATTERN.test(sql);
}

export function resolveExploreDateRangeForSql(
  sql: string
): ExploreDateRange | null {
  if (sqlHasExplicitTimeFilter(sql)) {
    return null;
  }

  return resolveDefaultExploreDateRange();
}
