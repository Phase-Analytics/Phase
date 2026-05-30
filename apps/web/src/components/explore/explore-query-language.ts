import type {
  ExploreFilter,
  ExploreGrain,
  ExploreQueryV1,
  ExploreTimeRange,
} from '@phase/shared';

const GRAIN_LABELS: Record<ExploreGrain, string> = {
  users: 'devices',
  events: 'events',
  sessions: 'sessions',
};

const AGGREGATION_LABELS: Record<
  ExploreQueryV1['metric']['aggregation'],
  string
> = {
  count: 'Count',
  count_distinct_users: 'Count unique devices',
  avg: 'Average',
  min: 'Minimum',
  max: 'Maximum',
  sum: 'Sum',
  p50: 'Median (p50)',
  p95: 'p95',
  field_summary: 'Summarize field',
  sessions_per_user: 'Sessions per device',
};

const OPERATOR_LABELS: Record<string, string> = {
  eq: 'is',
  neq: 'is not',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  contains: 'contains',
};

function formatValue(value: string | number | boolean | null): string {
  if (value === null) {
    return 'empty';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
}

export function grainLabel(grain: ExploreGrain): string {
  return GRAIN_LABELS[grain];
}

export function aggregationLabel(
  aggregation: ExploreQueryV1['metric']['aggregation']
): string {
  return AGGREGATION_LABELS[aggregation];
}

export function formatFilterClause(filter: ExploreFilter): string {
  switch (filter.type) {
    case 'event_performed':
      return filter.performed
        ? `performed "${filter.eventName}"`
        : `did not perform "${filter.eventName}"`;
    case 'event_property':
      return `"${filter.eventName}" ${filter.key} ${OPERATOR_LABELS[filter.operator] ?? filter.operator} ${formatValue(filter.value)}`;
    case 'device':
      return `device ${filter.field} ${OPERATOR_LABELS[filter.operator] ?? filter.operator} "${filter.value}"`;
    case 'device_property':
      return `device property ${filter.key} ${OPERATOR_LABELS[filter.operator] ?? filter.operator} ${formatValue(filter.value)}`;
    default:
      return 'condition';
  }
}

export function formatBreakdown(query: ExploreQueryV1): string | null {
  if (!query.breakdown) {
    return null;
  }
  if (query.breakdown.type === 'event_name') {
    return 'event name';
  }
  if (query.breakdown.type === 'device_pair') {
    return `${query.breakdown.fields[0]} + ${query.breakdown.fields[1]}`;
  }
  if (query.breakdown.type === 'device') {
    return query.breakdown.field;
  }
  if (query.breakdown.type === 'event_param') {
    return `${query.breakdown.eventName}.${query.breakdown.paramKey}`;
  }
  return null;
}

export function formatMetricField(query: ExploreQueryV1): string | null {
  const { field } = query.metric;
  if (!field) {
    return null;
  }
  if (field.kind === 'session_duration') {
    return 'session duration';
  }
  return `${field.eventName}.${field.paramKey}`;
}

export function describeExploreQuery(
  query: ExploreQueryV1,
  timeRange?: ExploreTimeRange
): string {
  const parts: string[] = [];
  const agg = aggregationLabel(query.metric.aggregation);
  const subject = grainLabel(query.grain);
  const metricField = formatMetricField(query);

  parts.push(
    metricField && query.metric.aggregation !== 'count'
      ? `${agg} ${metricField} of ${subject}`
      : `${agg} ${subject}`
  );

  if (query.filters.length > 0) {
    const clauses = query.filters.map(formatFilterClause);
    parts.push(`where ${clauses.join(' and ')}`);
  }

  const breakdown = formatBreakdown(query);
  if (breakdown) {
    parts.push(`split by ${breakdown}`);
  }

  if (query.groupBy === 'day') {
    parts.push('per day');
  }

  if (timeRange) {
    parts.push(`(${timeRange})`);
  }

  return parts.join(' ');
}

export function coveragePercent(
  matched: number,
  evaluated: number
): number | null {
  if (evaluated <= 0) {
    return null;
  }
  return Math.round((matched / evaluated) * 1000) / 10;
}
