import { eq } from 'drizzle-orm';
import { apps, db } from '@/db';
import { auth } from '@/lib/auth';
import { unauthorized } from '@/lib/response';

// biome-ignore lint/suspicious/noExplicitAny: Hono middleware context typing requires any
export const authMiddleware = async (c: any, next: any) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set('user', null);
    c.set('session', null);
    await next();
    return;
  }

  c.set('user', session.user);
  c.set('session', session.session);
  await next();
};

// biome-ignore lint/suspicious/noExplicitAny: Hono middleware context typing requires any
export const requireAuth = async (c: any, next: any) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return unauthorized(c, 'Authentication required');
  }

  c.set('user', session.user);
  c.set('session', session.session);
  await next();
};

// biome-ignore lint/suspicious/noExplicitAny: Hono middleware context typing requires any
export const requireAppKey = async (c: any, next: any) => {
  const authHeader = c.req.header('authorization');

  if (!authHeader) {
    return unauthorized(c, 'Authorization header is required');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return unauthorized(c, 'Invalid authorization format. Use: Bearer <token>');
  }

  const appKey = parts[1];

  if (!appKey) {
    return unauthorized(c, 'App key is required');
  }

  try {
    const app = await db.query.apps.findFirst({
      where: eq(apps.key, appKey),
    });

    if (!app) {
      return unauthorized(c, 'Invalid app key');
    }

    c.set('app', app);
    c.set('userId', app.userId);
    await next();
  } catch (error) {
    console.error('[Middleware] App key verification error:', error);
    return unauthorized(c, 'Failed to verify app key');
  }
};

// biome-ignore lint/suspicious/noExplicitAny: Hono middleware context typing requires any
export const verifyAppOwnership = async (c: any, next: any) => {
  const user = c.get('user');
  const query = c.req.valid('query');
  const appId = query.appId;

  if (!user) {
    return c.json(
      {
        code: 'UNAUTHORIZED',
        detail: 'Authentication required',
      },
      401
    );
  }

  if (!appId) {
    return c.json(
      {
        code: 'VALIDATION_ERROR',
        detail: 'appId is required',
      },
      400
    );
  }

  try {
    const userApp = await db.query.apps.findFirst({
      where: (table, { eq: eqFn, and: andFn }) =>
        andFn(eqFn(table.id, appId), eqFn(table.userId, user.id)),
    });

    if (!userApp) {
      return c.json(
        {
          code: 'FORBIDDEN',
          detail: 'You do not have permission to access this app',
        },
        403
      );
    }

    c.set('app', userApp);
    await next();
  } catch (error) {
    console.error('[Middleware] App ownership verification error:', error);
    return c.json(
      {
        code: 'INTERNAL_SERVER_ERROR',
        detail: 'Failed to verify app ownership',
      },
      500
    );
  }
};
