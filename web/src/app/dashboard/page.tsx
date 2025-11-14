'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appId = searchParams.get('app');

  useEffect(() => {
    if (!appId) {
      const lastAppId =
        typeof window !== 'undefined'
          ? localStorage.getItem('lastSelectedApp')
          : null;

      if (lastAppId) {
        router.replace(`/dashboard/analytics/overview?app=${lastAppId}`);
      }
    }
  }, [appId, router]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <h1 className="font-bold text-4xl">Dashboard</h1>
        {appId ? (
          <p className="mt-2 text-muted-foreground">App ID: {appId}</p>
        ) : (
          <p className="mt-2 text-muted-foreground">Please select an app</p>
        )}
      </div>
    </div>
  );
}
