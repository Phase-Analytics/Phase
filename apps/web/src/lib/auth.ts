import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001',
  fetchOptions: {
    credentials: 'include',
  },
});

export const { useSession, signIn, signOut, signUp } = authClient;
