import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { auth } from '@/lib/auth';
import { authMiddleware } from '@/lib/middleware';
import { configureOpenAPI } from '@/lib/openapi';
import { closeQueue } from '@/lib/queue';
import deviceRouter from '@/routes/device';
import eventRouter from '@/routes/event';
import health from '@/routes/health';
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
app.route('/event', eventRouter);

app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw));

configureOpenAPI(app);

const shutdown = async (_signal: string) => {
  try {
    await closeQueue();
    process.exit(0);
  } catch (error) {
    console.error('[Server] Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

if (process.env.NODE_ENV === 'development') {
  process.on('beforeExit', () => {
    closeQueue().catch((error) => {
      console.error('[Server] Error during beforeExit cleanup:', error);
    });
  });
}

export default app;
