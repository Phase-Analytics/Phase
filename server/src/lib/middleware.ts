import { auth } from '@/lib/auth';

// biome-ignore lint/suspicious/noExplicitAny: Hono context typing is complex
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

// biome-ignore lint/suspicious/noExplicitAny: Hono context typing is complex
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
