'use client';

import { useQueryState } from 'nuqs';

export default function OverviewPage() {
  const [appId] = useQueryState('app');

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h1 className="font-bold text-2xl">Overview</h1>
        <p className="text-muted-foreground text-sm">App ID: {appId}</p>
      </div>
    </div>
  );
}
