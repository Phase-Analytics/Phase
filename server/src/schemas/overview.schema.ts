import { z } from '@hono/zod-openapi';

export const overviewQuerySchema = z
  .object({
    appId: z.string().openapi({ example: '12345678901234' }),
  })
  .openapi('OverviewQuery');

export const overviewResponseSchema = z
  .object({
    totalDevices: z.number().openapi({ example: 42 }),
    activeDevices: z.number().openapi({ example: 5 }),
    dailyActiveUsers: z.number().openapi({ example: 18 }),
    totalSessions: z.number().openapi({ example: 128 }),
    averageSessionDuration: z.number().nullable().openapi({ example: 245.5 }),
  })
  .openapi('OverviewResponse');

export type OverviewQuery = z.infer<typeof overviewQuerySchema>;
export type OverviewResponse = z.infer<typeof overviewResponseSchema>;
