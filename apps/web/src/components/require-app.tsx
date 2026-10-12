'use client';

import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { AccessDenied } from '@/components/access-denied';
import { ApiError } from '@/lib/api/client';
import { useApp } from '@/lib/queries';

type RequireAppProps = {
  children: ReactNode;
};

export function RequireApp({ children }: RequireAppProps) {
  const [appId] = useQueryState('app');
  const router = useRouter();
  const { error } = useApp(appId || '');

  useEffect(() => {
    if (!appId) {
      router.replace('/dashboard');
    }
  }, [appId, router]);

  if (!appId) {
    return null;
  }

  if (error) {
    // Signed-out users are redirected by AuthRedirect; don't flash a denial.
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    return <AccessDenied />;
  }

  return children;
}
