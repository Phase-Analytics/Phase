import { Elysia } from 'elysia';
import { compression } from 'elysia-compress';
import { pool } from '@/db';
import { auth } from '@/lib/auth';
import { authCors, sdkCors, webCors } from '@/lib/cors';
import { runMigrations } from '@/lib/migrate';
import { initQuestDB } from '@/lib/questdb';
import { appWebRouter } from '@/routes/app';
import { deviceSdkRouter, deviceWebRouter } from '@/routes/device';
import { eventSdkRouter, eventWebRouter } from '@/routes/event';
import health from '@/routes/health';
import { pingSdkRouter } from '@/routes/ping';
import { sessionSdkRouter, sessionWebRouter } from '@/routes/session';

const sdkRoutes = new Elysia({ prefix: '/sdk' })
  .use(sdkCors)
  .use(pingSdkRouter)
  .use(deviceSdkRouter)
  .use(eventSdkRouter)
  .use(sessionSdkRouter);

const webRoutes = new Elysia({ prefix: '/web' })
  .use(webCors)
  .use(appWebRouter)
  .use(deviceWebRouter)
  .use(eventWebRouter)
  .use(sessionWebRouter);

const app = new Elysia()
  .use(compression())
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

try {
  await runMigrations();
  await initQuestDB();
} catch (error) {
  console.error('[Server] Failed to start:', error);
  process.exit(1);
}

const shutdown = async () => {
  try {
    console.log('[Server] Shutting down...');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('[Server] Shutdown error:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

app.listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

export default app;
