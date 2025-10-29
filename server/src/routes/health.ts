import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { errorResponses } from '@/lib/schemas';
import { HttpStatus } from '@/types/errors';

const healthResponseSchema = z.object({
  timestamp: z.string().openapi({ example: '2024-01-01T00:00:00Z' }),
  uptime: z.number().openapi({ example: 123.45 }),
  status: z.enum(['healthy', 'unhealthy']).openapi({ example: 'healthy' }),
  services: z.object({
    database: z.object({
      status: z.enum(['healthy', 'unhealthy', 'unknown']),
      latency: z.number(),
    }),
  }),
  responseTime: z.number().openapi({ example: 10 }),
});

const getHealthRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['health'],
  description: 'Health check',
  responses: {
    200: {
      description: 'Health status',
      content: {
        'application/json': {
          schema: healthResponseSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const health = new OpenAPIHono();

type ServiceStatus = {
  status: 'healthy' | 'unhealthy' | 'unknown';
  latency: number;
};

type HealthCheckData = {
  timestamp: string;
  uptime: number;
  status: 'healthy' | 'unhealthy';
  services: {
    database: ServiceStatus;
  };
  responseTime: number;
};

health.openapi(getHealthRoute, async (c) => {
  const startTime = Date.now();
  let overallStatus: 'healthy' | 'unhealthy' = 'healthy';

  const services: HealthCheckData['services'] = {
    database: { status: 'unknown', latency: 0 },
  };

  try {
    const dbStart = Date.now();
    await db.run(sql`SELECT 1`);
    services.database = {
      status: 'healthy',
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    overallStatus = 'unhealthy';
    services.database = {
      status: 'unhealthy',
      latency: 0,
    };
  }

  const totalLatency = Date.now() - startTime;

  const data: HealthCheckData = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    status: overallStatus,
    services,
    responseTime: totalLatency,
  };

  return c.json(data, HttpStatus.OK);
});

export default health;
