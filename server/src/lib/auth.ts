import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { lastLoginMethod, openAPI } from 'better-auth/plugins';
import { db } from '@/db';
import { user, session, account, verification } from '@/db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
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
  ],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
    },
    defaultCookieAttributes: {
      sameSite: 'none',
      secure: true,
      partitioned: true,
      domain:
        process.env.NODE_ENV === 'production' ? '.telemetra.dev' : undefined,
    },
  },
  experimental: {
    joins: true,
  },
});
