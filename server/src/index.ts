import { compress } from '@hono/bun-compress';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { pool } from '@/db';
import { auth } from '@/lib/auth';
import { authMiddleware } from '@/lib/middleware';
import { runMigrations } from '@/lib/migrate';
import { configureOpenAPI } from '@/lib/openapi';
import { initQuestDB } from '@/lib/questdb';
import { activityWebRouter } from '@/routes/activity';
import { appWebRouter } from '@/routes/app';
import { deviceSdkRouter, deviceWebRouter } from '@/routes/device';
import { errorSdkRouter, errorWebRouter } from '@/routes/error';
import { eventSdkRouter, eventWebRouter } from '@/routes/event';
import health from '@/routes/health';
import { overviewWebRouter } from '@/routes/overview';
import { pingSdkRouter } from '@/routes/ping';
import { sessionSdkRouter, sessionWebRouter } from '@/routes/session';
import { ErrorCode, HttpStatus } from '@/schemas';

const app = new OpenAPIHono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>({
  defaultHook: (result, c) => {
    if (!result.success) {
      const zodErrors = result.error.issues || [];
      const errors = zodErrors.map((err) => {
        const pathStr = err.path.map(String).join('.');
        return `${pathStr ? `${pathStr}: ` : ''}${err.message}`;
      });

      return c.json(
        {
          code: ErrorCode.VALIDATION_ERROR,
          detail: errors.length > 0 ? errors.join(', ') : 'Validation failed',
          meta: {
            errors: zodErrors,
          },
        },
        HttpStatus.BAD_REQUEST
      );
    }
  },
}).basePath('/v1');

const corsOrigins = [process.env.WEB_URL || 'http://localhost:3002'].filter(
  Boolean
);

app.use('*', compress());

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

app.onError((err, c) => {
  console.error('[Server] Unhandled error:', err);

  return c.json(
    {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      detail: err.message || 'An unexpected error occurred',
    },
    HttpStatus.INTERNAL_SERVER_ERROR
  );
});

app.route('/health', health);

app.route('/sdk/devices', deviceSdkRouter);
app.route('/sdk/sessions', sessionSdkRouter);
app.route('/sdk/events', eventSdkRouter);
app.route('/sdk/errors', errorSdkRouter);
app.route('/sdk/ping', pingSdkRouter);

app.route('/web/activity', activityWebRouter);
app.route('/web/apps', appWebRouter);
app.route('/web/devices', deviceWebRouter);
app.route('/web/errors', errorWebRouter);
app.route('/web/events', eventWebRouter);
app.route('/web/overview', overviewWebRouter);
app.route('/web/sessions', sessionWebRouter);

app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw));

configureOpenAPI(app);

try {
  await runMigrations();
  console.log('[Server] PostgreSQL migrations applied');

  await initQuestDB();
  console.log('[Server] QuestDB initialized');

  console.log('[Server] All databases ready');
} catch (error) {
  console.error('[Server] Failed to start:', error);
  process.exit(1);
}

const shutdown = async (signal: string) => {
  try {
    console.log(`[Server] Received ${signal}, shutting down gracefully...`);

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
