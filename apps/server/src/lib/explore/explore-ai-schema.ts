import {
  type ExploreBreakdown,
  type ExploreField,
  type ExploreFilter,
  ExploreFilterSchema,
  type ExploreQueryV1,
  ExploreQueryV1Schema,
} from '@phase/shared';
import { z } from 'zod';
import { normalizeExploreFilters } from './normalize-filters';

const nullString = z.union([z.string().max(128), z.null()]);
const nullOperator = z.union([z.string().max(32), z.null()]);
const nullDeviceField = z.union([
  z.enum(['platform', 'country', 'city', 'locale']),
  z.null(),
]);
const nullFilterValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const ExploreFilterAiSchema = z.object({
  type: z.enum([
    'event_performed',
    'event_property',
    'device',
    'device_property',
  ]),
  eventName: nullString,
  performed: z.union([z.boolean(), z.null()]),
  key: nullString,
  operator: nullOperator,
  value: nullFilterValue,
  field: nullDeviceField,
});

const ExploreMetricFieldAiSchema = z.object({
  kind: z.enum(['none', 'session_duration', 'event_param']),
  eventName: nullString,
  paramKey: nullString,
});

const ExploreBreakdownAiSchema = z.object({
  type: z.union([z.enum(['device', 'event_name', 'device_pair']), z.null()]),
  field: nullDeviceField,
  field2: nullDeviceField,
});

export const ExploreQueryV1AiSchema = z.object({
  version: z.literal(1),
  grain: z.enum(['users', 'events', 'sessions']),
  timeRange: z.enum(['7d', '30d', '180d', '360d']),
  filters: z.array(ExploreFilterAiSchema).max(20),
  metric: z.object({
    aggregation: z.enum([
      'count',
      'count_distinct_users',
      'avg',
      'min',
      'max',
      'sum',
      'field_summary',
      'sessions_per_user',
    ]),
    field: ExploreMetricFieldAiSchema,
  }),
  breakdown: ExploreBreakdownAiSchema,
  groupBy: z.union([z.enum(['day']), z.null()]),
});

export type ExploreQueryV1Ai = z.infer<typeof ExploreQueryV1AiSchema>;

export const ExploreAiGenerationSchema = ExploreQueryV1AiSchema.extend({
  summary: z.string().min(1).max(500),
});

export type ExploreAiGeneration = z.infer<typeof ExploreAiGenerationSchema>;

function coerceFilter(
  raw: z.infer<typeof ExploreFilterAiSchema>
): ExploreFilter {
  switch (raw.type) {
    case 'event_performed':
      return {
        type: 'event_performed',
        eventName: raw.eventName?.trim() || 'app_opened',
        performed: raw.performed ?? true,
      };
    case 'event_property':
      return {
        type: 'event_property',
        eventName: raw.eventName?.trim() || 'app_opened',
        key: raw.key?.trim() || 'duration',
        operator: (raw.operator ?? 'eq') as ExploreFilter extends {
          type: 'event_property';
        }
          ? ExploreFilter['operator']
          : never,
        value: raw.value ?? null,
      };
    case 'device':
      return {
        type: 'device',
        field: raw.field ?? 'platform',
        operator: raw.operator === 'neq' ? 'neq' : 'eq',
        value: raw.value?.toString().trim() || 'ios',
      };
    case 'device_property':
      return {
        type: 'device_property',
        key: raw.key?.trim() || 'tier',
        operator: (raw.operator ?? 'eq') as ExploreFilter extends {
          type: 'device_property';
        }
          ? ExploreFilter['operator']
          : never,
        value: raw.value ?? null,
      };
    default:
      return {
        type: 'event_performed',
        eventName: 'app_opened',
        performed: true,
      };
  }
}

function coerceBreakdown(
  raw: ExploreQueryV1Ai['breakdown']
): ExploreBreakdown | undefined {
  if (!raw.type) {
    return;
  }
  if (raw.type === 'event_name') {
    return { type: 'event_name' };
  }
  if (raw.type === 'device_pair' && raw.field && raw.field2) {
    return { type: 'device_pair', fields: [raw.field, raw.field2] };
  }
  if (raw.field && raw.field2) {
    return { type: 'device_pair', fields: [raw.field, raw.field2] };
  }
  if (raw.field) {
    return { type: 'device', field: raw.field };
  }
  return;
}

function coerceMetricField(
  raw: ExploreQueryV1Ai['metric']['field']
): ExploreField | undefined {
  if (raw.kind === 'none') {
    return;
  }
  if (raw.kind === 'session_duration') {
    return { kind: 'session_duration' };
  }
  return {
    kind: 'event_param',
    eventName: raw.eventName?.trim() || 'app_opened',
    paramKey: raw.paramKey?.trim() || 'duration',
  };
}

export function coerceExploreAiQueryToV1(
  raw: ExploreQueryV1Ai
): ExploreQueryV1 {
  return {
    version: 1,
    grain: raw.grain,
    timeRange: raw.timeRange,
    filters: raw.filters.map(coerceFilter),
    metric: {
      aggregation: raw.metric.aggregation,
      field: coerceMetricField(raw.metric.field),
    },
    breakdown: coerceBreakdown(raw.breakdown),
    groupBy: raw.groupBy ?? undefined,
  };
}

export function parseExploreAiGeneration(
  aiObject: ExploreQueryV1Ai
): ExploreQueryV1 {
  const coerced = coerceExploreAiQueryToV1(aiObject);

  const filters = coerced.filters.map((filter) =>
    ExploreFilterSchema.parse(filter)
  );

  return ExploreQueryV1Schema.parse({
    ...coerced,
    filters: normalizeExploreFilters(filters),
  });
}
