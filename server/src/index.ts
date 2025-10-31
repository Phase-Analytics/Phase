import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { pool } from '@/db';
import { auth } from '@/lib/auth';
import { authMiddleware } from '@/lib/middleware';
import { configureOpenAPI } from '@/lib/openapi';
import { redis } from '@/lib/redis';
import { startWorker } from '@/lib/worker';
import deviceRouter from '@/routes/device';
import eventRouter from '@/routes/event';
import health from '@/routes/health';
import pingRouter from '@/routes/ping';
import sessionRouter from '@/routes/session';

const app = new OpenAPIHono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>().basePath('/v1');

const corsOrigins = [process.env.WEB_URL || 'http://localhost:3001'].filter(
  Boolean
);

app.use(
  '/api/auth/*',
  cors({
    origin: corsOrigins,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
);

app.use('/web/*', authMiddleware);

app.route('/health', health);
app.route('/device', deviceRouter);
app.route('/session', sessionRouter);
app.route('/ping', pingRouter);
app.route('/event', eventRouter);

app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw));

configureOpenAPI(app);

let workerHandle: { stop: () => Promise<void> } | null = null;

startWorker()
  .then((handle) => {
    workerHandle = handle;
  })
  .catch((error) => {
    console.error('[Server] Failed to start worker:', error);
    process.exit(1);
  });

const shutdown = async (signal: string) => {
  try {
    console.log(`[Server] Received ${signal}, shutting down gracefully...`);

    if (workerHandle) {
      console.log('[Server] Stopping worker...');
      await workerHandle.stop();
      console.log('[Server] Worker stopped');
    }

    await redis.quit();
    console.log('[Server] Redis connection closed');

    await pool.end();
    console.log('[Server] Database pool closed');

    process.exit(0);
  } catch (error) {
    console.error('[Server] Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
