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

  const UNAUTHORIZED_STATUS = 401;
  if (!session) {
    return c.json({ error: 'Unauthorized' }, UNAUTHORIZED_STATUS);
  }

  c.set('user', session.user);
  c.set('session', session.session);
  await next();
};

// biome-ignore lint/suspicious/noExplicitAny: Hono middleware context typing requires any
export const requireApiKey = async (c: any, next: any) => {
  const authHeader = c.req.header('authorization');

  if (!authHeader) {
    return unauthorized(c, 'Authorization header is required');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return unauthorized(c, 'Invalid authorization format. Use: Bearer <token>');
  }

  const apiKey = parts[1];

  if (!apiKey) {
    return unauthorized(c, 'API key is required');
  }

  try {
    const result = await auth.api.verifyApiKey({
      body: {
        key: apiKey,
      },
    });

    if (!(result.valid && result.key)) {
      return unauthorized(
        c,
        result.error?.message || 'Invalid or expired API key'
      );
    }

    c.set('apiKey', result.key);
    c.set('userId', result.key.userId);
    await next();
  } catch (error) {
    console.error('[Middleware] API key verification error:', error);
    return unauthorized(c, 'Failed to verify API key');
  }
};
