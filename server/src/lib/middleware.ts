import { db } from '@/db';
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

// biome-ignore lint/suspicious/noExplicitAny: Hono middleware context typing requires any
export const verifyApiKeyOwnership = async (c: any, next: any) => {
  const user = c.get('user');
  const query = c.req.valid('query');
  const apiKeyId = query.apiKeyId;

  if (!user) {
    return c.json(
      {
        code: 'UNAUTHORIZED',
        detail: 'Authentication required',
      },
      401
    );
  }

  if (!apiKeyId) {
    return c.json(
      {
        code: 'VALIDATION_ERROR',
        detail: 'apiKeyId is required',
      },
      400
    );
  }

  try {
    const userApiKey = await db.query.apikey.findFirst({
      where: (table, { eq: eqFn, and: andFn }) =>
        andFn(eqFn(table.id, apiKeyId), eqFn(table.userId, user.id)),
    });

    if (!userApiKey) {
      return c.json(
        {
          code: 'FORBIDDEN',
          detail: 'You do not have permission to access this API key',
        },
        403
      );
    }

    c.set('apiKey', userApiKey);
    await next();
  } catch (error) {
    console.error('[Middleware] API key ownership verification error:', error);
    return c.json(
      {
        code: 'INTERNAL_SERVER_ERROR',
        detail: 'Failed to verify API key ownership',
      },
      500
    );
  }
};
