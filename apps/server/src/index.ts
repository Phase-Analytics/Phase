import { Elysia } from 'elysia';
import Redis from 'ioredis';
import { pool } from '@/db';
import { auth } from '@/lib/auth';
import { authCors, sdkCors, webCors } from '@/lib/cors';
import { initEventBuffer } from '@/lib/event-buffer';
import { initGeoIP, shutdownGeoIP } from '@/lib/geolocation';
import { runMigrations } from '@/lib/migrate';
import { initQuestDB } from '@/lib/questdb';
import { sseManager } from '@/lib/sse-manager';
import { appWebRouter } from '@/routes/app';
import { batchSdkRouter } from '@/routes/batch';
import { deviceSdkRouter, deviceWebRouter } from '@/routes/device';
import { eventSdkRouter, eventWebRouter } from '@/routes/event';
import health from '@/routes/health';
import { pingSdkRouter } from '@/routes/ping';
import { realtimeWebRouter } from '@/routes/realtime';
import { sessionSdkRouter, sessionWebRouter } from '@/routes/session';

const sdkRoutes = new Elysia({ prefix: '/sdk' })
  .use(sdkCors)
  .use(pingSdkRouter)
  .use(batchSdkRouter)
  .use(deviceSdkRouter)
  .use(eventSdkRouter)
  .use(sessionSdkRouter);

const webRoutes = new Elysia({ prefix: '/web' })
  .use(webCors)
  .use(appWebRouter)
  .use(deviceWebRouter)
  .use(eventWebRouter)
  .use(realtimeWebRouter)
  .use(sessionWebRouter);

const app = new Elysia()
  .use(authCors)
  .mount(auth.handler)
  .use(health)
  .use(sdkRoutes)
  .use(webRoutes)
  .onError(({ error, set }) => {
    console.error('[Server] Unhandled error:', error);
    set.status = 500;
    return {
      code: 'INTERNAL_SERVER_ERROR',
      detail:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  });

let eventBuffer: ReturnType<typeof initEventBuffer> | null = null;
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
