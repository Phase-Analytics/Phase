import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { pool } from '@/db';
import { redis } from '@/lib/redis';
import { methodNotAllowed } from '@/lib/response';
import { errorResponses, HttpStatus } from '@/schemas';

const healthResponseSchema = z.object({
  timestamp: z.string().openapi({ example: '2024-01-01T00:00:00Z' }),
  uptime: z.number().openapi({ example: 123.45 }),
  status: z.enum(['healthy', 'unhealthy']).openapi({ example: 'healthy' }),
  services: z.object({
    database: z.object({
      status: z.enum(['healthy', 'unhealthy', 'unknown']),
      latency: z.number(),
      error: z.string().optional(),
      message: z.string().optional(),
    }),
    redis: z.object({
      status: z.enum(['healthy', 'unhealthy', 'unknown']),
      latency: z.number(),
      error: z.string().optional(),
      message: z.string().optional(),
    }),
    cache: z
      .object({
        enabled: z.boolean(),
        strategy: z.string().optional(),
        ttl: z.number().optional(),
        cachedTables: z.array(z.string()).optional(),
      })
      .optional(),
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

health.all('*', async (c, next) => {
  const method = c.req.method;
  const allowedMethods = ['GET'];

  if (!allowedMethods.includes(method)) {
    return methodNotAllowed(c, allowedMethods);
  }

  await next();
});

type ServiceStatus = {
  status: 'healthy' | 'unhealthy' | 'unknown';
  latency: number;
  error?: string;
  message?: string;
};

type HealthCheckData = {
  timestamp: string;
  uptime: number;
  status: 'healthy' | 'unhealthy';
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
  };
  responseTime: number;
};

health.openapi(getHealthRoute, async (c) => {
  const startTime = Date.now();
  let overallStatus: 'healthy' | 'unhealthy' = 'healthy';

  const services: HealthCheckData['services'] = {
    database: { status: 'unknown', latency: 0 },
    redis: { status: 'unknown', latency: 0 },
  };

  try {
    const dbStart = Date.now();
    await pool.query('SELECT 1');
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
      error:
        error instanceof Error
          ? error.message
          : 'Unknown database connection error',
    };
  }

  try {
    const redisStart = Date.now();
    await redis.ping();
    services.redis = {
      status: 'healthy',
      latency: Date.now() - redisStart,
    };
  } catch (error) {
    console.error('Redis health check failed:', error);
    overallStatus = 'unhealthy';
    services.redis = {
      status: 'unhealthy',
      latency: 0,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown Redis connection error',
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
