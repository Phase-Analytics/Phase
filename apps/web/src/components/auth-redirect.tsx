'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth';
import {
  handoffToMobileApp,
  isMobileAuthCallback,
} from '@/lib/mobile-auth-handoff';

type AuthRedirectProps = {
  children: React.ReactNode;
  requireAuth?: boolean;
};

export function AuthRedirect(props: AuthRedirectProps) {
  return (
    <Suspense fallback={props.children}>
      <AuthRedirectInner {...props} />
    </Suspense>
  );
}

function AuthRedirectInner({
  children,
  requireAuth = true,
}: AuthRedirectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackURL = searchParams.get('callbackURL');
  const { data: session, isPending } = useSession();
  const handoffStarted = useRef(false);
  const [mobileHandoff, setMobileHandoff] = useState(false);

  useEffect(() => {
    if (isPending) {
      return;
    }

    if (requireAuth && !session) {
      router.push('/auth');
      return;
    }

    if (!requireAuth && session) {
      if (isMobileAuthCallback(callbackURL)) {
        if (handoffStarted.current) {
          return;
        }
        handoffStarted.current = true;
        setMobileHandoff(true);
        try {
          handoffToMobileApp(callbackURL);
        } catch (error) {
          handoffStarted.current = false;
          setMobileHandoff(false);
          toast.error(
            error instanceof Error
              ? error.message
              : 'Failed to open the Phase app'
          );
        }
        return;
      }
      router.push('/dashboard');
    }
  }, [session, isPending, router, requireAuth, callbackURL]);

  if (mobileHandoff) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Opening Phase…</p>
      </div>
    );
  }

  if (!isPending && requireAuth && !session) {
    return null;
  }
  if (!(isPending || requireAuth) && session) {
    return null;
  }

  return <>{children}</>;
}
