'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { useMemo } from 'react';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-page-header';
import { DomainsIntroCard } from '@/components/links/domains-intro-card';
import { LinkDomainsTable } from '@/components/links/link-domains-table';
import { RequireApp } from '@/components/require-app';
import { Card, CardContent } from '@/components/ui/card';
import { useLinkDomains } from '@/lib/queries';

export default function LinkDomainsPage() {
  const [appId] = useQueryState('app', parseAsString);
  const { data, isPending } = useLinkDomains(appId ?? '');

  const counts = useMemo(() => {
    const domains = data?.domains ?? [];
    return {
      total: domains.length,
      verified: domains.filter((d) => d.status === 'verified').length,
      pending: domains.filter((d) => d.status === 'pending').length,
    };
  }, [data?.domains]);

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <DashboardPageHeader
          description="Branded hostnames for your short links"
          title="Domains"
        />

        <DomainsIntroCard />

        {!isPending && data ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="py-0">
              <CardContent className="p-4">
                <p className="text-muted-foreground text-sm">Total</p>
                <p className="font-bold text-2xl tabular-nums">
                  {counts.total}
                </p>
              </CardContent>
            </Card>
            <Card className="py-0">
              <CardContent className="p-4">
                <p className="text-muted-foreground text-sm">Verified</p>
                <p className="font-bold text-2xl tabular-nums">
                  {counts.verified}
                </p>
              </CardContent>
            </Card>
            <Card className="py-0">
              <CardContent className="p-4">
                <p className="text-muted-foreground text-sm">Pending</p>
                <p className="font-bold text-2xl tabular-nums">
                  {counts.pending}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {appId ? (
          <LinkDomainsTable
            appId={appId}
            domains={data?.domains}
            isLoading={isPending}
          />
        ) : null}
      </div>
    </RequireApp>
  );
}
