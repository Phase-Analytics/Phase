import {
  type CacheServiceStatus,
  type HealthResponse,
  HealthResponseSchema,
  HttpStatus,
  type ServiceStatus,
} from '@phase/shared';
import { Elysia } from 'elysia';
import Redis from 'ioredis';
import { pool } from '@/db';

const health = new Elysia({ prefix: '/health' }).get(
  '/',
  async ({ set }) => {
    const startTime = Date.now();
    let overallStatus: 'healthy' | 'unhealthy' = 'healthy';

    const services: {
      database: ServiceStatus;
      questdb: ServiceStatus;
      cache: CacheServiceStatus;
    } = {
      database: { status: 'unknown', latency: 0 },
      questdb: { status: 'unknown', latency: 0 },
      cache: { status: 'unknown', latency: 0, enabled: false },
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
      const questdbStart = Date.now();
      const response = await fetch(
        'http://questdb:9000/exec?query=SELECT%201',
        {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        }
      );

      if (response.ok) {
        services.questdb = {
          status: 'healthy',
          latency: Date.now() - questdbStart,
        };
      } else {
        overallStatus = 'unhealthy';
        services.questdb = {
          status: 'unhealthy',
          latency: Date.now() - questdbStart,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      console.error('QuestDB health check failed:', error);
      overallStatus = 'unhealthy';
      services.questdb = {
        status: 'unhealthy',
        latency: 0,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown QuestDB connection error',
      };
    }

    if (process.env.REDIS_URL) {
      const redis = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
      });

      try {
        const redisStart = Date.now();
        await redis.connect();
        await redis.ping();
        services.cache = {
          status: 'healthy',
          latency: Date.now() - redisStart,
          enabled: true,
          strategy: 'explicit',
          ttl: 300,
        };
        await redis.quit();
      } catch (error) {
        console.error('Redis health check failed:', error);
        overallStatus = 'unhealthy';
        services.cache = {
          status: 'unhealthy',
          latency: 0,
          enabled: true,
          error:
            error instanceof Error
              ? error.message
              : 'Unknown Redis connection error',
        };
        try {
          await redis.quit();
        } catch {
          console.error('Failed to quit Redis connection:', error);
        }
      }
    } else {
      services.cache = {
        status: 'unknown',
        latency: 0,
        enabled: false,
      };
    }

    const totalLatency = Date.now() - startTime;

    const data: HealthResponse = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      status: overallStatus,
      services,
      responseTime: totalLatency,
    };

    set.status = HttpStatus.OK;
    return data;
  },
  {
    response: {
      200: HealthResponseSchema,
    },
  }
);

export default health;
