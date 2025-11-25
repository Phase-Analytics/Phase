import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { lastLoginMethod, openAPI } from 'better-auth/plugins';
import { db } from '@/db';
import { account, session, user, verification } from '@/db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  plugins: [lastLoginMethod(), openAPI()],
  emailAndPassword: {
    enabled: true,
  },
  baseURL: process.env.SERVER_URL || 'http://localhost:3001',
  trustedOrigins: [
    process.env.WEB_URL || 'http://localhost:3002',
    'http://localhost:3002',
    'https://telemetra.dev',
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  advanced: {
    useSecureCookies: true,
    crossSubDomainCookies: {
      enabled: true,
    },
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
      domain:
        process.env.NODE_ENV === 'production' ? '.telemetra.dev' : undefined,
    },
  },
});
