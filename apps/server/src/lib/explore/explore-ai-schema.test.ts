import { describe, expect, test } from 'bun:test';
import { parseExploreAiGeneration } from './explore-ai-schema';
import { validateExploreQuery } from './validate';

const noMetricField = {
  kind: 'none' as const,
  eventName: null,
  paramKey: null,
};

describe('parseExploreAiGeneration', () => {
  test('coerces paywall platform breakdown query', () => {
    const query = parseExploreAiGeneration({
      version: 1,
      grain: 'users',
      timeRange: '7d',
      filters: [
        {
          type: 'event_performed',
          eventName: 'paywall_clicked',
          performed: true,
          key: null,
          operator: null,
          value: null,
          field: null,
        },
      ],
      metric: { aggregation: 'count', field: noMetricField },
      breakdown: { type: 'device', field: 'platform', field2: null },
      groupBy: null,
    });

    expect(query.grain).toBe('users');
    expect(query.breakdown).toEqual({ type: 'device', field: 'platform' });
    expect(() => validateExploreQuery(query)).not.toThrow();
  });

  test('coerces level_ended field summary', () => {
    const query = parseExploreAiGeneration({
      version: 1,
      grain: 'events',
      timeRange: '7d',
      filters: [
        {
          type: 'event_performed',
          eventName: 'level_ended',
          performed: true,
          key: null,
          operator: null,
          value: null,
          field: null,
        },
      ],
      metric: {
        aggregation: 'field_summary',
        field: {
          kind: 'event_param',
          eventName: 'level_ended',
          paramKey: 'duration',
        },
      },
      breakdown: { type: null, field: null, field2: null },
      groupBy: null,
    });

    expect(query.metric.field).toEqual({
      kind: 'event_param',
      eventName: 'level_ended',
      paramKey: 'duration',
    });
    expect(() => validateExploreQuery(query)).not.toThrow();
  });
});
