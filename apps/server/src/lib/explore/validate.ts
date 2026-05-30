import type { ExploreQueryV1 } from '@phase/shared';
import { ExploreEngineError } from './errors';

export function validateExploreQuery(query: ExploreQueryV1): void {
  const { grain, metric, groupBy } = query;

  if (groupBy === 'day') {
    const sessionsPerUserTrend =
      grain === 'users' && metric.aggregation === 'sessions_per_user';
    const avgDurationTrend =
      grain === 'sessions' &&
      metric.aggregation === 'avg' &&
      metric.field?.kind === 'session_duration';
    const sessionCountTrend =
      grain === 'sessions' && metric.aggregation === 'count';
    const eventCountTrend =
      grain === 'events' && metric.aggregation === 'count';

    if (
      !(
        sessionsPerUserTrend ||
        avgDurationTrend ||
        sessionCountTrend ||
        eventCountTrend
      )
    ) {
      throw new ExploreEngineError(
        'Group by day requires a supported daily metric (sessions per device, session count, event count, or avg session duration)'
      );
    }
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
    query.breakdown?.type === 'device_pair' &&
    grain !== 'users' &&
    grain !== 'sessions'
  ) {
    throw new ExploreEngineError(
      'Country + platform breakdown requires devices or sessions grain'
    );
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
