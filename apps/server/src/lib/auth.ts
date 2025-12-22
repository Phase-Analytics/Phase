import { polar, portal } from '@polar-sh/better-auth';
import { Polar } from '@polar-sh/sdk';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';
import { account, session, user, verification } from '@/db/schema';
import { sendPasswordResetEmail } from './email';

if (!process.env.POLAR_ACCESS_TOKEN) {
  throw new Error('POLAR_ACCESS_TOKEN is not set');
}

const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: 'production',
});

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
  plugins: [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [portal()],
    }),
  ],
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    },
  },
  emailAndPassword: {
    disableSignUp: false,
    enabled: true,
    async sendResetPassword({ user: userAccount, url }) {
      try {
        await sendPasswordResetEmail({
          to: userAccount.email,
          userName: userAccount.name || 'there',
          resetUrl: url,
        });
      } catch (error) {
        console.error('Failed to send password reset email:', error);
        if (process.env.NODE_ENV === 'production') {
          throw error;
        }
      }
    },
  },
  baseURL: process.env.SERVER_URL || 'http://localhost:3001',
  trustedOrigins: [
    process.env.WEB_URL || 'http://localhost:3002',
    'http://localhost:3002',
    'https://phase.sh',
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24,
    },
  },
  advanced: {
    useSecureCookies: true,
    crossSubDomainCookies: {
      enabled: true,
    },
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
      domain: process.env.NODE_ENV === 'production' ? '.phase.sh' : undefined,
    },
  },
});
