import {
  type CacheServiceStatus,
  type HealthResponse,
  HealthResponseSchema,
  HttpStatus,
  type ServiceStatus,
} from '@phase/shared';
import { Elysia } from 'elysia';
import { pool } from '@/db';
import { getRedis } from '@/lib/rate-limit';

const SERVICE_UNAVAILABLE = 503;
const HEALTH_CACHE_TTL_MS = 5000;
const PROBE_TIMEOUT_MS = 2000;

type Probe = () => Promise<void>;

let cached: { data: HealthResponse; expiresAt: number } | null = null;
let inFlight: Promise<HealthResponse> | null = null;

function withTimeout(probe: Probe): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('Health probe timed out')),
      PROBE_TIMEOUT_MS
    );
  });
  return Promise.race([probe(), timeout]).finally(() => clearTimeout(timer));
}

async function checkService(
  name: string,
  probe: Probe
): Promise<ServiceStatus> {
  const startedAt = Date.now();
  try {
    await withTimeout(probe);
    return { status: 'healthy', latency: Date.now() - startedAt };
  } catch (error) {
    console.error(`[Health] ${name} check failed:`, error);
    return {
      status: 'unhealthy',
      latency: Date.now() - startedAt,
      error: `${name} unavailable`,
    };
  }
}

async function probeDatabase(): Promise<void> {
  await pool.query('SELECT 1');
}

async function probeQuestDb(): Promise<void> {
  const response = await fetch('http://questdb:9000/exec?query=SELECT%201', {
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  });
  await response.body?.cancel();
  if (!response.ok) {
    throw new Error(`QuestDB responded with HTTP ${response.status}`);
  }
}

async function checkCache(): Promise<CacheServiceStatus> {
  const redis = getRedis();
  if (!redis) {
    return { status: 'unknown', latency: 0, enabled: false };
  }

  const status = await checkService('Cache', async () => {
    await redis.ping();
  });

  return { ...status, enabled: true, strategy: 'explicit', ttl: 300 };
}

async function computeHealth(): Promise<HealthResponse> {
  const startedAt = Date.now();
  const [database, questdb, cache] = await Promise.all([
    checkService('Database', probeDatabase),
    checkService('QuestDB', probeQuestDb),
    checkCache(),
  ]);

  const unhealthy = [database, questdb, cache].some(
    (service) => service.status === 'unhealthy'
  );

  return {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    status: unhealthy ? 'unhealthy' : 'healthy',
    services: { database, questdb, cache },
    responseTime: Date.now() - startedAt,
  };
}

/**
 * Probes run at most once per HEALTH_CACHE_TTL_MS and concurrent callers
 * share one in-flight check, so hammering /health cannot fan out into
 * Postgres, QuestDB and Redis load.
 */
function getHealth(): Promise<HealthResponse> {
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.data);
  }
  inFlight ??= computeHealth()
    .then((data) => {
      cached = { data, expiresAt: Date.now() + HEALTH_CACHE_TTL_MS };
      return data;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

const health = new Elysia({ prefix: '/health' }).get(
  '/',
  async ({ set }) => {
    const data = await getHealth();
    set.status =
      data.status === 'healthy' ? HttpStatus.OK : SERVICE_UNAVAILABLE;
    return data;
  },
  {
    response: {
      200: HealthResponseSchema,
      503: HealthResponseSchema,
    },
  }
);

export default health;
