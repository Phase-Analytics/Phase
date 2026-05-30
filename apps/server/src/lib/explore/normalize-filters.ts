import type { ExploreFilter } from '@phase/shared';

const DEVICE_COLUMN_KEYS = new Set(['platform', 'country', 'city', 'locale']);

export function normalizeExploreFilter(filter: ExploreFilter): ExploreFilter {
  if (filter.type === 'device_property' && DEVICE_COLUMN_KEYS.has(filter.key)) {
    const operator = filter.operator === 'neq' ? 'neq' : 'eq';

    return {
      type: 'device',
      field: filter.key as 'platform' | 'country' | 'city' | 'locale',
      operator,
      value: String(filter.value ?? '').trim(),
    };
  }

  return filter;
}

export function normalizeExploreFilters(
  filters: ExploreFilter[]
): ExploreFilter[] {
  return filters.map(normalizeExploreFilter);
}
