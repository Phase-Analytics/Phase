import { lastLoginMethodClient, organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.SERVER_URL || 'http://localhost:3001',
  plugins: [lastLoginMethodClient(), organizationClient()],
});

export const { useSession, signIn, signOut, signUp } = authClient;
