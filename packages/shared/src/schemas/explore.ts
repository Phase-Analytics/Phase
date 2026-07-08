import { z } from 'zod';

export const ExploreTimeRangeSchema = z.enum(['7d', '30d', '180d', '360d']);

export const ExploreSqlQuerySchema = z.object({
  version: z.literal(1),
  sql: z.string().trim().min(1).max(10_000),
});

export const ExploreTableResultSchema = z.object({
  kind: z.literal('table'),
  columns: z.array(z.string()),
  rows: z.array(z.array(z.unknown())),
});

export const ExploreResultSchema = ExploreTableResultSchema;

export const ExploreRunMetaSchema = z.object({
  generatedAt: z.string().datetime(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  offset: z.number().int().min(0),
  rowCount: z.number().min(0),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  executionMs: z.number().min(0).optional(),
  appliedDateRange: z
    .object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
    })
    .nullable()
    .optional(),
});

export const ExploreRunResponseSchema = z.object({
  result: ExploreResultSchema,
  meta: ExploreRunMetaSchema,
});

export const ExplorePresetSchema = z.object({
  id: z.string(),
  appId: z.string(),
  name: z.string().trim().min(1).max(100),
  query: ExploreSqlQuerySchema,
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
  query: ExploreSqlQuerySchema,
});

export const UpdateExplorePresetRequestSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  query: ExploreSqlQuerySchema.optional(),
});

export const ExploreRunRequestSchema = z.object({
  appId: z.string().min(1),
  query: ExploreSqlQuerySchema,
  page: z.number().int().min(1).default(1),
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
export type ExploreSqlQuery = z.infer<typeof ExploreSqlQuerySchema>;
export type ExploreResult = z.infer<typeof ExploreResultSchema>;
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
