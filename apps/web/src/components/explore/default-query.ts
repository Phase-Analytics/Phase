import type { ExploreQueryV1 } from '@phase/shared';

export const defaultExploreQuery = (): ExploreQueryV1 => ({
  version: 1,
  grain: 'users',
  timeRange: '7d',
  filters: [],
  metric: { aggregation: 'count' },
});

export const explorePresetsSeed: Array<{ name: string; query: ExploreQueryV1 }> = [
  {
    name: 'Paywall by platform',
    query: {
      version: 1,
      grain: 'users',
      timeRange: '30d',
      filters: [
        {
          type: 'event_performed',
          eventName: 'paywall_clicked',
          performed: true,
        },
      ],
      metric: { aggregation: 'count' },
      breakdown: { type: 'device', field: 'platform' },
    },
  },
  {
    name: 'Level duration summary',
    query: {
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
    },
  },
  {
    name: 'Long levels (>300s)',
    query: {
      version: 1,
      grain: 'events',
      timeRange: '30d',
      filters: [
        { type: 'event_performed', eventName: 'level_ended', performed: true },
        {
          type: 'event_property',
          eventName: 'level_ended',
          key: 'duration',
          operator: 'gt',
          value: 300,
        },
      ],
      metric: { aggregation: 'count' },
    },
  },
  {
    name: 'TR Android avg session',
    query: {
      version: 1,
      grain: 'sessions',
      timeRange: '30d',
      filters: [
        { type: 'device', field: 'platform', operator: 'eq', value: 'android' },
        { type: 'device', field: 'country', operator: 'eq', value: 'TR' },
      ],
      metric: {
        aggregation: 'avg',
        field: { kind: 'session_duration' },
      },
    },
  },
  {
    name: 'iOS sessions per user / day',
    query: {
      version: 1,
      grain: 'users',
      timeRange: '30d',
      filters: [
        { type: 'device', field: 'platform', operator: 'eq', value: 'ios' },
      ],
      metric: { aggregation: 'sessions_per_user' },
      groupBy: 'day',
    },
  },
];
