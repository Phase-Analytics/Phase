'use client';

import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

type RequireAppProps = {
  children: ReactNode;
};

export function RequireApp({ children }: RequireAppProps) {
  const [appId] = useQueryState('app');
  const router = useRouter();

  useEffect(() => {
    if (!appId) {
      router.replace('/dashboard');
    }
  }, [appId, router]);

  if (!appId) {
    return null;
  }

  return children;
}
