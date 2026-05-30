import { describe, expect, test } from 'bun:test';
import { parseExploreAiGeneration } from './explore-ai-schema';
import { validateExploreQuery } from './validate';

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
        },
      ],
      metric: { aggregation: 'count' },
      breakdown: { type: 'device', field: 'platform' },
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
    });

    expect(query.metric.field).toEqual({
      kind: 'event_param',
      eventName: 'level_ended',
      paramKey: 'duration',
    });
    expect(() => validateExploreQuery(query)).not.toThrow();
  });
});
