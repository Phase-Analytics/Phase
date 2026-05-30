import { z } from 'zod';
import { PropertyOperatorSchema } from './device';

export const ExploreTimeRangeSchema = z.enum(['7d', '30d', '180d', '360d']);

export const ExploreGrainSchema = z.enum(['users', 'events', 'sessions']);

export const ExploreGroupBySchema = z.enum(['day']);

export const ExploreDeviceFieldSchema = z.enum([
  'platform',
  'country',
  'city',
  'locale',
]);

export const ExploreEventPerformedFilterSchema = z.object({
  type: z.literal('event_performed'),
  eventName: z.string().min(1).max(128),
  performed: z.boolean(),
});

export const ExploreEventPropertyFilterSchema = z.object({
  type: z.literal('event_property'),
  eventName: z.string().min(1).max(128),
  key: z.string().min(1).max(128),
  operator: PropertyOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
});

export const ExploreDeviceFilterSchema = z.object({
  type: z.literal('device'),
  field: ExploreDeviceFieldSchema,
  operator: z.enum(['eq', 'neq']),
  value: z.string().min(1).max(256),
});

export const ExploreDevicePropertyFilterSchema = z.object({
  type: z.literal('device_property'),
  key: z.string().min(1).max(128),
  operator: PropertyOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
});

export const ExploreFilterSchema = z.discriminatedUnion('type', [
  ExploreEventPerformedFilterSchema,
  ExploreEventPropertyFilterSchema,
  ExploreDeviceFilterSchema,
  ExploreDevicePropertyFilterSchema,
]);

export const ExploreEventParamFieldSchema = z.object({
  kind: z.literal('event_param'),
  eventName: z.string().min(1).max(128),
  paramKey: z.string().min(1).max(128),
});

export const ExploreSessionDurationFieldSchema = z.object({
  kind: z.literal('session_duration'),
});

export const ExploreFieldSchema = z.discriminatedUnion('kind', [
  ExploreEventParamFieldSchema,
  ExploreSessionDurationFieldSchema,
]);

export const ExploreAggregationSchema = z.enum([
  'count',
  'count_distinct_users',
  'avg',
  'min',
  'max',
  'sum',
  'p50',
  'p95',
  'field_summary',
  'sessions_per_user',
]);

export const ExploreMetricSchema = z.object({
  aggregation: ExploreAggregationSchema,
  field: ExploreFieldSchema.optional(),
});

export const ExploreBreakdownSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('device'), field: ExploreDeviceFieldSchema }),
  z.object({ type: z.literal('event_name') }),
  z.object({
    type: z.literal('event_param'),
    eventName: z.string().min(1).max(128),
    paramKey: z.string().min(1).max(128),
  }),
]);

export const ExploreQueryV1Schema = z.object({
  version: z.literal(1),
  grain: ExploreGrainSchema,
  timeRange: ExploreTimeRangeSchema,
  filters: z.array(ExploreFilterSchema).max(20),
  metric: ExploreMetricSchema,
  breakdown: ExploreBreakdownSchema.optional(),
  groupBy: ExploreGroupBySchema.optional(),
});

export const ExploreScalarResultSchema = z.object({
  kind: z.literal('scalar'),
  value: z.number(),
  label: z.string(),
});

export const ExploreBreakdownRowSchema = z.object({
  dimension: z.string(),
  value: z.number(),
});

export const ExploreBreakdownResultSchema = z.object({
  kind: z.literal('breakdown'),
  rows: z.array(ExploreBreakdownRowSchema),
});

export const ExploreTimeseriesPointSchema = z.object({
  date: z.string(),
  value: z.number(),
});

export const ExploreTimeseriesResultSchema = z.object({
  kind: z.literal('timeseries'),
  points: z.array(ExploreTimeseriesPointSchema),
});

export const ExploreDistributionBucketSchema = z.object({
  bucket: z.string(),
  count: z.number().min(0),
});

export const ExploreDistributionResultSchema = z.object({
  kind: z.literal('distribution'),
  buckets: z.array(ExploreDistributionBucketSchema),
});

export const ExplorePercentileRowSchema = z.object({
  label: z.string(),
  value: z.number(),
});

export const ExplorePercentilesResultSchema = z.object({
  kind: z.literal('percentiles'),
  rows: z.array(ExplorePercentileRowSchema),
});

export const ExploreResultSchema = z.discriminatedUnion('kind', [
  ExploreScalarResultSchema,
  ExploreBreakdownResultSchema,
  ExploreTimeseriesResultSchema,
  ExploreDistributionResultSchema,
  ExplorePercentilesResultSchema,
]);

export const ExploreCoverageSchema = z.object({
  evaluated: z.number().min(0),
  matched: z.number().min(0),
  unit: z.enum(['devices', 'events', 'sessions']),
});

export const ExploreRunMetaSchema = z.object({
  generatedAt: z.string().datetime(),
  rowCount: z.number().min(0),
  truncated: z.boolean().optional(),
  coverage: ExploreCoverageSchema.optional(),
});

export const ExploreRunResponseSchema = z.object({
  result: ExploreResultSchema,
  meta: ExploreRunMetaSchema,
});

export const ExplorePresetSchema = z.object({
  id: z.string(),
  appId: z.string(),
  name: z.string().trim().min(1).max(100),
  query: ExploreQueryV1Schema,
  createdByUserId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ExplorePresetsListResponseSchema = z.object({
  presets: z.array(ExplorePresetSchema),
});

export const CreateExplorePresetRequestSchema = z.object({
  appId: z.string().min(1),
  name: z.string().trim().min(1, 'Preset name is required').max(100),
  query: ExploreQueryV1Schema,
});

export const UpdateExplorePresetRequestSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  query: ExploreQueryV1Schema.optional(),
});

export const ExploreRunRequestSchema = z.object({
  appId: z.string().min(1),
  query: ExploreQueryV1Schema,
});

export const ExploreGenerateQueryRequestSchema = z.object({
  appId: z.string().min(1),
  prompt: z.string().trim().min(3).max(2000),
});

export const ExploreGenerateQueryResponseSchema = z.object({
  query: ExploreQueryV1Schema,
  summary: z.string().min(1).max(500),
});

export const ExploreCatalogResponseSchema = z.object({
  eventNames: z.array(z.string()),
  deviceFields: z.object({
    platforms: z.array(z.string()),
    countries: z.array(z.string()),
  }),
  paramKeysByEvent: z.record(z.string(), z.array(z.string())),
});

export type ExploreTimeRange = z.infer<typeof ExploreTimeRangeSchema>;
export type ExploreGrain = z.infer<typeof ExploreGrainSchema>;
export type ExploreFilter = z.infer<typeof ExploreFilterSchema>;
export type ExploreField = z.infer<typeof ExploreFieldSchema>;
export type ExploreMetric = z.infer<typeof ExploreMetricSchema>;
export type ExploreBreakdown = z.infer<typeof ExploreBreakdownSchema>;
export type ExploreQueryV1 = z.infer<typeof ExploreQueryV1Schema>;
export type ExploreResult = z.infer<typeof ExploreResultSchema>;
export type ExploreCoverage = z.infer<typeof ExploreCoverageSchema>;
export type ExploreRunMeta = z.infer<typeof ExploreRunMetaSchema>;
export type ExploreRunResponse = z.infer<typeof ExploreRunResponseSchema>;
export type ExplorePreset = z.infer<typeof ExplorePresetSchema>;
export type ExploreCatalogResponse = z.infer<
  typeof ExploreCatalogResponseSchema
>;
export type CreateExplorePresetRequest = z.infer<
  typeof CreateExplorePresetRequestSchema
>;
export type UpdateExplorePresetRequest = z.infer<
  typeof UpdateExplorePresetRequestSchema
>;
export type ExplorePresetsListResponse = z.infer<
  typeof ExplorePresetsListResponseSchema
>;
export type ExploreGenerateQueryRequest = z.infer<
  typeof ExploreGenerateQueryRequestSchema
>;
export type ExploreGenerateQueryResponse = z.infer<
  typeof ExploreGenerateQueryResponseSchema
>;
