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

  test('rejects groupBy without supported daily trend metric', () => {
    const query: ExploreQueryV1 = {
      ...base,
      groupBy: 'day',
      metric: { aggregation: 'count' },
    };
    expect(() => validateExploreQuery(query)).toThrow(ExploreEngineError);
  });

  test('allows daily avg session duration on sessions grain', () => {
    const query: ExploreQueryV1 = {
      version: 1,
      grain: 'sessions',
      timeRange: '7d',
      filters: [
        { type: 'device', field: 'country', operator: 'eq', value: 'TR' },
      ],
      metric: {
        aggregation: 'avg',
        field: { kind: 'session_duration' },
      },
      groupBy: 'day',
    };
    expect(() => validateExploreQuery(query)).not.toThrow();
  });

  test('allows daily event count on events grain', () => {
    const query: ExploreQueryV1 = {
      version: 1,
      grain: 'events',
      timeRange: '7d',
      filters: [
        { type: 'device', field: 'platform', operator: 'eq', value: 'ios' },
        {
          type: 'event_performed',
          eventName: 'artwork_swiped',
          performed: true,
        },
      ],
      metric: { aggregation: 'count' },
      groupBy: 'day',
    };
    expect(() => validateExploreQuery(query)).not.toThrow();
  });

  test('allows device_pair breakdown on users grain', () => {
    const query: ExploreQueryV1 = {
      version: 1,
      grain: 'users',
      timeRange: '7d',
      filters: [
        {
          type: 'event_performed',
          eventName: 'paywall_clicked',
          performed: true,
        },
      ],
      metric: { aggregation: 'count' },
      breakdown: { type: 'device_pair', fields: ['country', 'platform'] },
    };
    expect(() => validateExploreQuery(query)).not.toThrow();
  });

  test('allows level_ended field summary on events', () => {
    const query: ExploreQueryV1 = {
      version: 1,
      grain: 'events',
      timeRange: '30d',
      filters: [
        { type: 'event_performed', eventName: 'level_ended', performed: true },
      ],
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
