import { createHash } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { ErrorCode, HttpStatus } from '@phase/shared';
import { Elysia } from 'elysia';
import Redis from 'ioredis';
import { pool } from '@/db';
import { closeExplorePool, ensureExploreRole } from '@/db/explore-pool';
import { auth } from '@/lib/auth';
import { getClientIp, getSocketAddress } from '@/lib/client-ip';
import { authCors, publicCors, sdkCors, webCors } from '@/lib/cors';
import { initEventBuffer } from '@/lib/event-buffer';
import { initGeoIP, shutdownGeoIP } from '@/lib/geolocation';
import { hashPublicApiToken } from '@/lib/keys';
import {
  getLinkClickBuffer,
  initLinkClickBuffer,
  initLinkClicksTable,
} from '@/lib/links/click-buffer';
import { runMigrations } from '@/lib/migrate';
import { initQuestDB } from '@/lib/questdb';
import {
  checkPublicApiRateLimit,
  checkWebApiRateLimit,
  RATE_LIMIT_STRATEGIES,
  type RateLimitResult,
} from '@/lib/rate-limit';
import { startRetention, stopRetention } from '@/lib/retention';
import { checkSdkRateLimit } from '@/lib/sdk-rate-limit';
import { initSessionActivityBuffer } from '@/lib/session-activity-buffer';
import { startSessionCleanup, stopSessionCleanup } from '@/lib/session-cleanup';
import { sseManager } from '@/lib/sse-manager';
import { adminWebRouter } from '@/routes/admin';
import { appWebRouter } from '@/routes/app';
import { authRouter } from '@/routes/auth';
import { batchSdkRouter } from '@/routes/batch';
import { deviceSdkRouter, deviceWebRouter } from '@/routes/device';
import { eventSdkRouter, eventWebRouter } from '@/routes/event';
import { exploreWebRouter } from '@/routes/explore';
import { funnelWebRouter } from '@/routes/funnel';
import health from '@/routes/health';
import { linkRedirectRouter } from '@/routes/links/redirect';
import { linksWebRouter } from '@/routes/links/web';
import { pingSdkRouter } from '@/routes/ping';
import { policiesPublicRouter, policiesWebRouter } from '@/routes/policies';
import { publicApiRouter } from '@/routes/public-api';
import { realtimeWebRouter } from '@/routes/realtime';
import { sessionSdkRouter, sessionWebRouter } from '@/routes/session';
import { waitlistPublicRouter } from '@/routes/waitlist';

function requestIp(request: Request, server: unknown): string | null {
  return getClientIp(request, getSocketAddress(request, server));
}

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

function getWebRateLimitIdentifier(request: Request, ip: string): string {
  const cookie = request.headers.get('cookie');
  if (!cookie) {
    return `ip:${ip}`;
  }

  const sessionHash = createHash('sha256').update(cookie).digest('hex');
  return `session:${sessionHash}`;
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
}

const sdkRoutes = new Elysia({ prefix: '/sdk' })
  .use(sdkCors)
  .onBeforeHandle(async ({ request, set, server }) => {
    const outcome = await checkSdkRateLimit(
      request,
      requestIp(request, server)
    );
    if (!outcome) {
      return;
    }
    return handleRateLimitResponse(outcome.result, outcome.limit, set);
  })
  .use(pingSdkRouter)
  .use(batchSdkRouter)
  .use(deviceSdkRouter)
  .use(eventSdkRouter)
  .use(sessionSdkRouter);

const webRoutes = new Elysia({ prefix: '/web' })
  .use(webCors)
  .onBeforeHandle(async ({ request, set, server }) => {
    const ip = requestIp(request, server);

    if (!ip) {
      return;
    }

    const rateLimitResult = await checkWebApiRateLimit(
      getWebRateLimitIdentifier(request, ip)
    );

    return handleRateLimitResponse(
      rateLimitResult,
      RATE_LIMIT_STRATEGIES.WEB_API.maxAttempts,
      set
    );
  })
  .use(adminWebRouter)
  .use(appWebRouter)
  .use(deviceWebRouter)
  .use(eventWebRouter)
  .use(exploreWebRouter)
  .use(funnelWebRouter)
  .use(linksWebRouter)
  .use(policiesWebRouter)
  .use(realtimeWebRouter)
  .use(sessionWebRouter);

const publicRoutes = new Elysia({ prefix: '/public' })
  .use(publicCors)
  .use(waitlistPublicRouter)
  .use(policiesPublicRouter);

const publicApiRoutes = new Elysia({ prefix: '/public-api' })
  .onBeforeHandle(async ({ request, set, server }) => {
    const ip = requestIp(request, server);
    const bearerToken = extractBearerToken(request);
    const tokenIdentifier = bearerToken
      ? hashPublicApiToken(bearerToken)
      : ip || 'anonymous';

    const rateLimitResult = await checkPublicApiRateLimit(
      tokenIdentifier,
      ip || undefined
    );

    return handleRateLimitResponse(
      rateLimitResult,
      RATE_LIMIT_STRATEGIES.PUBLIC_API.maxAttempts,
      set
    );
  })
  .use(publicApiRouter);

const authRoutes = new Elysia()
  .use(authCors)
  .use(authRouter)
  .mount(auth.handler);

const app = new Elysia()
  .use(authRoutes)
  .use(health)
  .use(sdkRoutes)
  .use(webRoutes)
  .use(publicRoutes)
  .use(publicApiRoutes)
  .use(linkRedirectRouter)
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION' || code === 'PARSE') {
      set.status = HttpStatus.BAD_REQUEST;
      return {
        code: ErrorCode.VALIDATION_ERROR,
        detail: code === 'PARSE' ? 'Malformed request body' : 'Invalid request',
      };
    }
    if (code === 'NOT_FOUND') {
      set.status = HttpStatus.NOT_FOUND;
      return { code: ErrorCode.NOT_FOUND, detail: 'Not found' };
    }

    // Internal error details stay in the logs, never in the response.
    console.error('[Server] Unhandled error:', error);
    set.status = HttpStatus.INTERNAL_SERVER_ERROR;
    return {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      detail: 'An unexpected error occurred',
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
  await initLinkClicksTable();

  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL);
    redisClient.on('error', (error) => {
      console.error('[Redis] Connection error:', error.message);
    });
    eventBuffer = initEventBuffer(process.env.REDIS_URL);
    eventBuffer.start();
    initLinkClickBuffer(process.env.REDIS_URL);
  } else {
    console.warn(
      '[Server] REDIS_URL not set, event buffering disabled - events will not be persisted'
    );
  }

  sessionActivityBuffer = initSessionActivityBuffer();
  sessionActivityBuffer.start();
  startSessionCleanup(redisClient);
  startRetention(redisClient);

  const geoip = initGeoIP();
  await geoip.initialize();

  sseManager.start();
} catch (error) {
  console.error('[Server] Failed to start:', error);
  process.exit(1);
}

// Fails closed for Explore only and logs on its own; ingest must not wait.
ensureExploreRole();

// Must stay below the container stop_grace_period (30s).
const SHUTDOWN_TIMEOUT_MS = 25_000;
const SERVER_DRAIN_TIMEOUT_MS = 5000;
let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`[Server] ${signal} received, shutting down`);

  const deadline = Date.now() + SHUTDOWN_TIMEOUT_MS;
  setTimeout(() => {
    console.error('[Server] Shutdown timed out, exiting');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  let exitCode = 0;
  const step = async (name: string, task: () => Promise<unknown> | unknown) => {
    try {
      await task();
    } catch (error) {
      exitCode = 1;
      console.error(`[Server] Shutdown step "${name}" failed:`, error);
    }
  };

  // Stop accepting requests, end SSE streams so they do not hold the server
  // open, then give in-flight ingest requests a moment to reach the buffers.
  const serverStopped = app.server?.stop();
  await step('sse', () => sseManager.stop());
  await step('server', () =>
    Promise.race([serverStopped, sleep(SERVER_DRAIN_TIMEOUT_MS)])
  );

  stopSessionCleanup();
  stopRetention();
  shutdownGeoIP();
  getLinkClickBuffer()?.stop();

  await step('session activity', () => sessionActivityBuffer?.flushAndClose());
  await step('event buffer', () => eventBuffer?.flushAndClose(deadline - 2000));
  await step('redis', () => redisClient?.quit());
  await step('explore pool', closeExplorePool);
  await step('postgres', () => pool.end());

  process.exit(exitCode);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

app.listen(3001);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
