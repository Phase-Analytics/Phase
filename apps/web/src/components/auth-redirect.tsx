'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/lib/auth';

type AuthRedirectProps = {
  children: React.ReactNode;
  requireAuth?: boolean;
};

export function AuthRedirect({
  children,
  requireAuth = true,
}: AuthRedirectProps) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (isPending) {
      return;
    }

    if (requireAuth && !session) {
      router.push('/auth');
    } else if (!requireAuth && session) {
      router.push('/dashboard');
    }
  }, [session, isPending, router, requireAuth]);

  if (!isPending && requireAuth && !session) {
    return null;
  }
  if (!(isPending || requireAuth) && session) {
    return null;
  }

  return <>{children}</>;
}
