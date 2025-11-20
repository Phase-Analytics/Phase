import { compress } from '@hono/bun-compress';
import { OpenAPIHono } from '@hono/zod-openapi';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { pool } from '@/db';
import { auth } from '@/lib/auth';
import { authMiddleware } from '@/lib/middleware';
import { runMigrations } from '@/lib/migrate';
import { configureOpenAPI } from '@/lib/openapi';
import { initQuestDB } from '@/lib/questdb';
import { appWebRouter } from '@/routes/app';
import { deviceSdkRouter, deviceWebRouter } from '@/routes/device';
import { eventSdkRouter, eventWebRouter } from '@/routes/event';
import health from '@/routes/health';
import { pingSdkRouter } from '@/routes/ping';
import { sessionSdkRouter, sessionWebRouter } from '@/routes/session';
import { ErrorCode, HttpStatus } from '@/schemas';

const rootApp = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

const apiApp = new OpenAPIHono<{
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

const corsOrigins = (() => {
  const webUrl = process.env.WEB_URL || 'http://localhost:3002';
  const origins = [webUrl];

  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3002', 'http://127.0.0.1:3002');
  }

  return [...new Set(origins.filter(Boolean))];
})();

rootApp.use('*', compress());

rootApp.use(
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

apiApp.use(
  '/sdk/*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
    exposeHeaders: [
      'Content-Length',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
    ],
    maxAge: 600,
    credentials: false,
  })
);

apiApp.use(
  '/web/*',
  cors({
    origin: corsOrigins,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
);

apiApp.use('/web/*', authMiddleware);

apiApp.onError((err, c) => {
  console.error('[Server] Unhandled error:', err);

  return c.json(
    {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      detail: err.message || 'An unexpected error occurred',
    },
    HttpStatus.INTERNAL_SERVER_ERROR
  );
});

apiApp.route('/health', health);

apiApp.route('/sdk/devices', deviceSdkRouter);
apiApp.route('/sdk/sessions', sessionSdkRouter);
apiApp.route('/sdk/events', eventSdkRouter);
apiApp.route('/sdk/ping', pingSdkRouter);

apiApp.route('/web/apps', appWebRouter);
apiApp.route('/web/devices', deviceWebRouter);
apiApp.route('/web/events', eventWebRouter);
apiApp.route('/web/sessions', sessionWebRouter);

rootApp.route('/', apiApp);

rootApp.use('/api/auth/*', (c) => auth.handler(c.req.raw));

if (process.env.NODE_ENV !== 'production') {
  configureOpenAPI(apiApp);
}

try {
  await runMigrations();
  await initQuestDB();
} catch (error) {
  console.error('[Server] Failed to start:', error);
  process.exit(1);
}

const shutdown = async () => {
  try {
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('[Server] Shutdown error:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default rootApp;
