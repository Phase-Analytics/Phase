import { polarClient } from '@polar-sh/better-auth/client';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001',
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [polarClient()],
});

export const { useSession, signIn, signOut, signUp } = authClient;

export async function forgotPassword(email: string, redirectTo: string) {
  return await authClient.requestPasswordReset({
    email,
    redirectTo,
  });
}

export const polarPortal = {
  getPortalUrl: () => authClient.customer.portal(),
  getCustomerState: () => authClient.customer.state(),
};
