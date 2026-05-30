import type { ExploreQueryV1, ExploreTimeRange } from '@phase/shared';

/** Query definition for builder/presets; time range comes from URL `range`. */
export type ExploreQueryDefinition = ExploreQueryV1;

export function buildExploreRunQuery(
  query: ExploreQueryDefinition,
  timeRange: ExploreTimeRange
): ExploreQueryV1 {
  return { ...query, timeRange };
}

export function isExplorePresetSavable(
  name: string,
  query: ExploreQueryDefinition
): boolean {
  if (!name.trim()) {
    return false;
  }

  const hasFilters = query.filters.length > 0;
  const hasBreakdown = Boolean(query.breakdown);
  const hasGroupBy = Boolean(query.groupBy);
  const hasField = Boolean(query.metric.field);
  const isNonDefaultMetric =
    query.metric.aggregation !== 'count' || query.grain !== 'users' || hasField;

  return hasFilters || hasBreakdown || hasGroupBy || isNonDefaultMetric;
}
