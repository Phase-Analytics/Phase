import { checkout, polar, portal } from '@polar-sh/better-auth';
import { Polar } from '@polar-sh/sdk';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';
import { account, session, user, verification } from '@/db/schema';
import { sendPasswordResetEmail } from './email';

const IP_ADDRESS_REGEX = /^\d+\.\d+\.\d+\.\d+$/;

const getCookieDomain = (): string | undefined => {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const webUrl = process.env.WEB_URL;
  if (!webUrl) {
    return;
  }

  try {
    const url = new URL(webUrl);
    const hostname = url.hostname;

    if (hostname === 'localhost' || IP_ADDRESS_REGEX.test(hostname)) {
      return;
    }

    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return `.${parts.slice(-2).join('.')}`;
    }

    return;
  } catch {
    return;
  }
};

const plugins: ReturnType<typeof polar>[] = [];

if (process.env.POLAR_ACCESS_TOKEN) {
  const polarClient = new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN,
    server: 'production',
  });

  plugins.push(
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        portal(),
        checkout({
          products: [
            {
              productId: '424d9f27-70f9-4c59-9194-53b9203e759d',
              slug: 'starter-monthly',
            },
            {
              productId: '502762e6-b5d7-4e5a-8f5d-8ce981d0f8b9',
              slug: 'starter-yearly',
            },
            {
              productId: '746f7856-ed6a-439b-969f-392d0e97b510',
              slug: 'enterprise-monthly',
            },
            {
              productId: '2f41af77-87b9-4a17-ae1d-6ef179b48bdc',
              slug: 'enterprise-yearly',
            },
          ],
          successUrl: `${process.env.WEB_URL || 'http://localhost:3002'}/dashboard`,
          authenticatedUsersOnly: true,
        }),
      ],
    })
  );
} else {
  console.warn(
    'POLAR_ACCESS_TOKEN not configured. Polar integration (billing, checkout, portal) is disabled.'
  );
}

const socialProviders: Record<
  string,
  { clientId: string; clientSecret: string }
> = {};

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  };
} else {
  console.warn(
    'GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET not configured. GitHub OAuth is disabled.'
  );
}

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
  plugins,
  socialProviders,
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
    ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3002'] : []),
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
      domain: getCookieDomain(),
    },
  },
});
