'use client';

import { useQueryState } from 'nuqs';
import { RequireApp } from '@/components/require-app';

export default function FeedbacksPage() {
  const [appId] = useQueryState('app');

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-4">
        <div>
          <h1 className="font-bold text-2xl">Feedbacks</h1>
          <p className="text-muted-foreground text-sm">App ID: {appId}</p>
        </div>
      </div>
    </RequireApp>
  );
}
