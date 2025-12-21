import { ErrorCode, HttpStatus } from '@phase/shared';
import { Elysia } from 'elysia';
import Redis from 'ioredis';
import { pool } from '@/db';
import { auth } from '@/lib/auth';
import { authCors, publicCors, sdkCors, webCors } from '@/lib/cors';
import { initEventBuffer } from '@/lib/event-buffer';
import { initGeoIP, shutdownGeoIP } from '@/lib/geolocation';
import { runMigrations } from '@/lib/migrate';
import { initQuestDB } from '@/lib/questdb';
import {
  checkSdkApiRateLimit,
  checkWebApiRateLimit,
  RATE_LIMIT_STRATEGIES,
  type RateLimitResult,
} from '@/lib/rate-limit';
import { initSessionActivityBuffer } from '@/lib/session-activity-buffer';
import { sseManager } from '@/lib/sse-manager';
import { appWebRouter } from '@/routes/app';
import { authRouter } from '@/routes/auth';
import { batchSdkRouter } from '@/routes/batch';
import { deviceSdkRouter, deviceWebRouter } from '@/routes/device';
import { eventSdkRouter, eventWebRouter } from '@/routes/event';
import health from '@/routes/health';
import { pingSdkRouter } from '@/routes/ping';
import { realtimeWebRouter } from '@/routes/realtime';
import { sessionSdkRouter, sessionWebRouter } from '@/routes/session';
import { waitlistPublicRouter } from '@/routes/waitlist';

function extractClientIP(request: Request, server?: unknown): string | null {
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const socketIp = (
    server as { requestIP?: (req: Request) => { address: string } | null }
  )?.requestIP?.(request);

  return (
    cfConnectingIp ||
    forwardedFor?.split(',')[0]?.trim() ||
    realIp ||
    (socketIp?.address as string) ||
    null
  );
}

function handleRateLimitResponse(
  rateLimitResult: RateLimitResult,
  limit: number,
  set: {
    status?: number | string;
    headers: {
      [key: string]: string | number;
    };
  }
): { code: string; detail: string } | undefined {
  set.headers['X-RateLimit-Limit'] = String(limit);
  set.headers['X-RateLimit-Remaining'] = String(rateLimitResult.remaining ?? 0);

  if (rateLimitResult.resetAt) {
    set.headers['X-RateLimit-Reset'] = String(
      Math.floor(rateLimitResult.resetAt / 1000)
    );
  }

  if (!rateLimitResult.allowed) {
    if (rateLimitResult.resetAt) {
      const retryAfter = Math.ceil(
        (rateLimitResult.resetAt - Date.now()) / 1000
      );
      set.headers['Retry-After'] = String(Math.max(0, retryAfter));
    }

    set.status = HttpStatus.TOO_MANY_REQUESTS;
    return {
      code: ErrorCode.TOO_MANY_REQUESTS,
      detail: rateLimitResult.reason || 'Too many requests',
    };
  }

  return;
}

const sdkRoutes = new Elysia({ prefix: '/sdk' })
  .use(sdkCors)
  .onBeforeHandle(async ({ request, body, set, server }) => {
    const ip = extractClientIP(request, server);
    const deviceId = (body as { deviceId?: string })?.deviceId;

    if (!(deviceId || ip)) {
      return;
    }

    const rateLimitResult = await checkSdkApiRateLimit(
      deviceId || ip || '',
      ip || undefined
    );

    return handleRateLimitResponse(
      rateLimitResult,
      RATE_LIMIT_STRATEGIES.SDK_API.maxAttempts,
      set
    );
  })
  .use(pingSdkRouter)
  .use(batchSdkRouter)
  .use(deviceSdkRouter)
  .use(eventSdkRouter)
  .use(sessionSdkRouter);

const webRoutes = new Elysia({ prefix: '/web' })
  .use(webCors)
  .onBeforeHandle(async ({ request, set, server }) => {
    const ip = extractClientIP(request, server);

    if (!ip) {
      return;
    }

    const rateLimitResult = await checkWebApiRateLimit(ip);

    return handleRateLimitResponse(
      rateLimitResult,
      RATE_LIMIT_STRATEGIES.WEB_API.maxAttempts,
      set
    );
  })
  .use(appWebRouter)
  .use(deviceWebRouter)
  .use(eventWebRouter)
  .use(realtimeWebRouter)
  .use(sessionWebRouter);

const publicRoutes = new Elysia({ prefix: '/public' })
  .use(publicCors)
  .use(waitlistPublicRouter);

const app = new Elysia()
  .use(authCors)
  .use(authRouter)
  .mount(auth.handler)
  .use(health)
  .use(sdkRoutes)
  .use(webRoutes)
  .use(publicRoutes)
  .onError(({ error, set }) => {
    console.error('[Server] Unhandled error:', error);
    set.status = 500;
    return {
      code: 'INTERNAL_SERVER_ERROR',
      detail:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  });

if (!process.env.WEB_URL) {
  throw new Error('WEB_URL environment variable is required');
}

let eventBuffer: ReturnType<typeof initEventBuffer> | null = null;
let sessionActivityBuffer: ReturnType<typeof initSessionActivityBuffer> | null =
  null;
let redisClient: Redis | null = null;

try {
  await runMigrations();
  await initQuestDB();

  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL);
    eventBuffer = initEventBuffer(process.env.REDIS_URL);
    eventBuffer.start();
  } else {
    console.warn(
      '[Server] REDIS_URL not set, event buffering disabled - events will not be persisted'
    );
  }

  sessionActivityBuffer = initSessionActivityBuffer();
  sessionActivityBuffer.start();

  const geoip = initGeoIP();
  await geoip.initialize();

  sseManager.start();
} catch (error) {
  console.error('[Server] Failed to start:', error);
  process.exit(1);
}

const shutdown = async () => {
  try {
    console.log('[Server] Shutting down...');
    app.server?.stop();
    sseManager.stop();
    shutdownGeoIP();

    if (sessionActivityBuffer) {
      await sessionActivityBuffer.flushAndClose();
    }

    if (eventBuffer) {
      await eventBuffer.flushAndClose();
    }

    if (redisClient) {
      await redisClient.quit();
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('[Server] Shutdown error:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

app.listen(3001);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
