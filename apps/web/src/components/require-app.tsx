'use client';

import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { AccessDenied } from '@/components/access-denied';
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
    return <AccessDenied />;
  }

  return children;
}
