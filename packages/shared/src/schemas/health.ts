import { z } from 'zod';

const ServiceStatusSchema = z.object({
  status: z.enum(['healthy', 'unhealthy', 'unknown']),
  latency: z.number(),
  error: z.string().optional(),
  message: z.string().optional(),
});

const CacheServiceStatusSchema = ServiceStatusSchema.extend({
  enabled: z.boolean(),
  strategy: z.string().optional(),
  ttl: z.number().optional(),
});

export const HealthResponseSchema = z.object({
  timestamp: z.string().datetime(),
  uptime: z.number(),
  status: z.enum(['healthy', 'unhealthy']),
  services: z.object({
    database: ServiceStatusSchema,
    questdb: ServiceStatusSchema,
    cache: CacheServiceStatusSchema,
  }),
  responseTime: z.number(),
});

export type ServiceStatus = z.infer<typeof ServiceStatusSchema>;
export type CacheServiceStatus = z.infer<typeof CacheServiceStatusSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
