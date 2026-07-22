'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-page-header';
import { PoliciesTable } from '@/components/policies/policies-table';
import { RequireApp } from '@/components/require-app';
import { Skeleton } from '@/components/ui/skeleton';
import { usePolicies } from '@/lib/queries';

export default function PoliciesPage() {
  const [appId] = useQueryState('app', parseAsString);
  const { data, isPending } = usePolicies(appId ?? '');

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <DashboardPageHeader
          description="Host legal docs as short links with click analytics"
          title="Policies"
        />

        {appId ? (
          <PoliciesTable
            appId={appId}
            isLoading={isPending}
            policies={data?.policies}
          />
        ) : (
          <div className="space-y-2 rounded-md border p-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
      </div>
    </RequireApp>
  );
}
