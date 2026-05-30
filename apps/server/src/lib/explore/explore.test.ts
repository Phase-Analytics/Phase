import { describe, expect, test } from 'bun:test';
import type { ExploreQueryV1 } from '@phase/shared';
import { ExploreEngineError } from './errors';
import { resolveExploreDateRange } from './time-range';
import { validateExploreQuery } from './validate';

describe('resolveExploreDateRange', () => {
  test('7d range ends at now', () => {
    const range = resolveExploreDateRange('7d');
    const start = new Date(range.startDate).getTime();
    const end = new Date(range.endDate).getTime();
    const diffDays = (end - start) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeGreaterThan(6.9);
    expect(diffDays).toBeLessThan(7.1);
  });
});

describe('validateExploreQuery', () => {
  const base: ExploreQueryV1 = {
    version: 1,
    grain: 'users',
    timeRange: '7d',
    filters: [],
    metric: { aggregation: 'count' },
  };

  test('allows paywall cohort breakdown query', () => {
    const query: ExploreQueryV1 = {
      ...base,
      filters: [
        {
          type: 'event_performed',
          eventName: 'paywall_clicked',
          performed: true,
        },
      ],
      breakdown: { type: 'device', field: 'platform' },
    };
    expect(() => validateExploreQuery(query)).not.toThrow();
  });

  test('rejects sessions_per_user on events grain', () => {
    const query: ExploreQueryV1 = {
      ...base,
      grain: 'events',
      metric: { aggregation: 'sessions_per_user' },
    };
    expect(() => validateExploreQuery(query)).toThrow(ExploreEngineError);
  });

  test('rejects groupBy without sessions_per_user', () => {
    const query: ExploreQueryV1 = {
      ...base,
      groupBy: 'day',
      metric: { aggregation: 'count' },
    };
    expect(() => validateExploreQuery(query)).toThrow(ExploreEngineError);
  });

  test('allows level_ended field summary on events', () => {
    const query: ExploreQueryV1 = {
      version: 1,
      grain: 'events',
      timeRange: '30d',
      filters: [{ type: 'event_performed', eventName: 'level_ended', performed: true }],
      metric: {
        aggregation: 'field_summary',
        field: {
          kind: 'event_param',
          eventName: 'level_ended',
          paramKey: 'duration',
        },
      },
    };
    expect(() => validateExploreQuery(query)).not.toThrow();
  });
});
