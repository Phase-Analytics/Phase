import type { ExploreQueryV1 } from '@phase/shared';
import { ExploreEngineError } from './errors';

export function validateExploreQuery(query: ExploreQueryV1): void {
  const { grain, metric, groupBy } = query;

  if (groupBy === 'day' && metric.aggregation !== 'sessions_per_user') {
    throw new ExploreEngineError(
      'Group by day is only supported with sessions per user metric'
    );
  }

  if (metric.aggregation === 'sessions_per_user' && grain !== 'users') {
    throw new ExploreEngineError('Sessions per user requires Users grain');
  }

  if (metric.field?.kind === 'session_duration' && grain !== 'sessions') {
    throw new ExploreEngineError(
      'Session duration field requires Sessions grain'
    );
  }

  if (metric.field?.kind === 'event_param' && grain !== 'events') {
    throw new ExploreEngineError('Event param field requires Events grain');
  }

  if (
    metric.aggregation === 'field_summary' &&
    metric.field?.kind !== 'event_param'
  ) {
    throw new ExploreEngineError('Field summary requires an event param field');
  }

  if (query.breakdown?.type === 'event_name' && grain !== 'events') {
    throw new ExploreEngineError('Event name breakdown requires Events grain');
  }

  if (query.breakdown?.type === 'event_param' && grain !== 'events') {
    throw new ExploreEngineError('Event param breakdown requires Events grain');
  }

  if (
    (metric.aggregation === 'avg' ||
      metric.aggregation === 'min' ||
      metric.aggregation === 'max' ||
      metric.aggregation === 'sum' ||
      metric.aggregation === 'p50' ||
      metric.aggregation === 'p95') &&
    metric.field?.kind !== 'event_param' &&
    metric.field?.kind !== 'session_duration'
  ) {
    throw new ExploreEngineError('Aggregation requires a numeric field');
  }
}
