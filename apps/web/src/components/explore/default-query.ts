import type { ExploreQueryV1 } from '@phase/shared';

export function defaultExploreQuery(): ExploreQueryV1 {
  return {
  version: 1,
  grain: 'users',
  timeRange: '7d',
  filters: [],
  metric: { aggregation: 'count' },
  };
}
