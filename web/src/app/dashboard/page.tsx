'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { AppSwitcher } from '@/components/app-switcher';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appId = searchParams.get('app');

  useEffect(() => {
    if (appId) {
      router.replace(`/dashboard/analytics/overview?app=${appId}`);
    } else {
      const lastAppId =
        typeof window !== 'undefined'
          ? localStorage.getItem('lastSelectedApp')
          : null;

      if (lastAppId) {
        router.replace(`/dashboard/analytics/overview?app=${lastAppId}`);
      }
    }
  }, [appId, router]);

  if (appId) {
    return null;
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="font-bold text-3xl">Welcome to Telemetra</h1>
          <p className="mt-2 text-muted-foreground">
            Select an app to get started with analytics
          </p>
        </div>

        <AppSwitcher variant="standalone" />
      </div>
    </div>
  );
}
