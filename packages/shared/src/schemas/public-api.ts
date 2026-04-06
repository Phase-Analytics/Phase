import { z } from 'zod';

export const PublicApiTokenStatusSchema = z.enum([
  'active',
  'expired',
  'revoked',
]);

export const PublicApiTokenSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  tokenPrefix: z.string(),
  expiresAt: z.string().datetime().nullable(),
  lastUsedAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  status: PublicApiTokenStatusSchema,
});

export const PublicApiTokensResponseSchema = z.object({
  tokens: z.array(PublicApiTokenSchema),
});

export const CreatePublicApiTokenRequestSchema = z.object({
  name: z.string().min(1).max(100),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const CreatePublicApiTokenResponseSchema = PublicApiTokenSchema.extend({
  token: z.string(),
});

export const PublicApiMetaSchema = z.object({
  generatedAt: z.string().datetime(),
  consistency: z.literal('eventual'),
  identityModel: z.literal('user'),
});

export const PublicApiLimitsSchema = z.object({
  maxReportRangeDays: z.number().int().positive(),
  maxBreakdownLimit: z.number().int().positive(),
  maxBatchSize: z.number().int().positive(),
  maxRawPageSize: z.number().int().positive(),
});

export const PublicApiEventOverviewResponseSchema = z.object({
  totalEvents: z.number().min(0),
  events24h: z.number().min(0),
  totalEventsChange24h: z.number(),
  events24hChange: z.number(),
  meta: PublicApiMetaSchema,
});

export const PublicApiEventTimeseriesDataPointSchema = z.object({
  date: z.string(),
  eventCount: z.number().min(0),
});

export const PublicApiEventTimeseriesResponseSchema = z.object({
  data: z.array(PublicApiEventTimeseriesDataPointSchema),
  period: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
  meta: PublicApiMetaSchema,
});

export const PublicApiEventBreakdownDimensionSchema = z.enum([
  'eventName',
  'screenName',
]);

export const PublicApiEventBreakdownResponseSchema = z.object({
  dimension: PublicApiEventBreakdownDimensionSchema,
  metric: z.literal('eventCount'),
  rows: z.array(
    z.object({
      value: z.string(),
      count: z.number().min(0),
    })
  ),
  meta: PublicApiMetaSchema,
});

export const PublicApiSessionTimeseriesMetricSchema = z.enum([
  'sessionCount',
  'avgSessionDuration',
  'bounceRate',
]);

export const PublicApiSessionOverviewResponseSchema = z.object({
  totalSessions: z.number().min(0),
  averageSessionDuration: z.number().nullable(),
  activeSessions24h: z.number().min(0),
  bounceRate: z.number().min(0).max(100),
  totalSessionsChange24h: z.number(),
  activeSessions24hChange: z.number(),
  meta: PublicApiMetaSchema,
});

export const PublicApiSessionTimeseriesDataPointSchema = z.object({
  date: z.string(),
  sessionCount: z.number().min(0).optional(),
  avgSessionDuration: z.number().min(0).optional(),
  bounceRate: z.number().min(0).max(100).optional(),
});

export const PublicApiSessionTimeseriesResponseSchema = z.object({
  data: z.array(PublicApiSessionTimeseriesDataPointSchema),
  period: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
  meta: PublicApiMetaSchema,
});

export const PublicApiSessionBreakdownDimensionSchema = z.enum([
  'platform',
  'country',
  'city',
]);

export const PublicApiSessionBreakdownResponseSchema = z.object({
  dimension: PublicApiSessionBreakdownDimensionSchema,
  metric: z.literal('sessionCount'),
  rows: z.array(
    z.object({
      value: z.string(),
      count: z.number().min(0),
      country: z.string().optional(),
    })
  ),
  meta: PublicApiMetaSchema,
});

export const PublicApiUserOverviewResponseSchema = z.object({
  totalUsers: z.number().min(0),
  activeUsers24h: z.number().min(0),
  newUsers24h: z.number().min(0),
  platformStats: z.record(z.string(), z.number().min(0)),
  countryStats: z.record(z.string(), z.number().min(0)),
  cityStats: z.record(
    z.string(),
    z.object({
      count: z.number().min(0),
      country: z.string(),
    })
  ),
  totalUsersChange24h: z.number(),
  activeUsers24hChange: z.number(),
  newUsers24hChange: z.number(),
  meta: PublicApiMetaSchema,
});

export const PublicApiUserTimeseriesMetricSchema = z.enum([
  'activeUsers',
  'totalUsers',
  'newUsers',
]);

export const PublicApiUserTimeseriesDataPointSchema = z.object({
  date: z.string(),
  activeUsers: z.number().min(0).optional(),
  totalUsers: z.number().min(0).optional(),
  newUsers: z.number().min(0).optional(),
});

export const PublicApiUserTimeseriesResponseSchema = z.object({
  data: z.array(PublicApiUserTimeseriesDataPointSchema),
  period: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
  meta: PublicApiMetaSchema,
});

export const PublicApiUserBreakdownDimensionSchema = z.enum([
  'platform',
  'country',
  'city',
]);

export const PublicApiUserBreakdownResponseSchema = z.object({
  dimension: PublicApiUserBreakdownDimensionSchema,
  metric: z.literal('userCount'),
  rows: z.array(
    z.object({
      value: z.string(),
      count: z.number().min(0),
      country: z.string().optional(),
    })
  ),
  meta: PublicApiMetaSchema,
});

export type PublicApiToken = z.infer<typeof PublicApiTokenSchema>;
export type CreatePublicApiTokenRequest = z.infer<
  typeof CreatePublicApiTokenRequestSchema
>;
export type CreatePublicApiTokenResponse = z.infer<
  typeof CreatePublicApiTokenResponseSchema
>;
export type PublicApiEventBreakdownDimension = z.infer<
  typeof PublicApiEventBreakdownDimensionSchema
>;
export type PublicApiSessionTimeseriesMetric = z.infer<
  typeof PublicApiSessionTimeseriesMetricSchema
>;
export type PublicApiSessionBreakdownDimension = z.infer<
  typeof PublicApiSessionBreakdownDimensionSchema
>;
export type PublicApiUserTimeseriesMetric = z.infer<
  typeof PublicApiUserTimeseriesMetricSchema
>;
export type PublicApiUserBreakdownDimension = z.infer<
  typeof PublicApiUserBreakdownDimensionSchema
>;
