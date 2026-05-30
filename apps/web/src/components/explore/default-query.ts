import type { ExploreQueryV1 } from '@phase/shared';

export const defaultExploreQuery = (): ExploreQueryV1 => ({
  version: 1,
  grain: 'users',
  timeRange: '7d',
  filters: [],
  metric: { aggregation: 'count' },
});
