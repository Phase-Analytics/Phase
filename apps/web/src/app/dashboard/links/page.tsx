'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { useMemo } from 'react';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-page-header';
import { LinksIntroCard } from '@/components/links/links-intro-card';
import { LinksTable } from '@/components/links/links-table';
import { RequireApp } from '@/components/require-app';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLinks } from '@/lib/queries';

export default function LinksPage() {
  const [appId] = useQueryState('app', parseAsString);
  const { data, isPending } = useLinks(appId ?? '');

  const counts = useMemo(() => {
    const links = data?.links ?? [];
    const now = Date.now();
    let active = 0;
    let inactive = 0;

    for (const link of links) {
      const expired =
        link.expiresAt && new Date(link.expiresAt).getTime() <= now;
      if (link.disabledAt || expired) {
        inactive += 1;
      } else {
        active += 1;
      }
    }

    return { total: links.length, active, inactive };
  }, [data?.links]);

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <DashboardPageHeader
          description="Create and manage short links"
          title="Links"
        />

        {appId ? <LinksIntroCard appId={appId} /> : null}

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
                <p className="text-muted-foreground text-sm">Active</p>
                <p className="font-bold text-2xl tabular-nums">
                  {counts.active}
                </p>
              </CardContent>
            </Card>
            <Card className="py-0">
              <CardContent className="p-4">
                <p className="text-muted-foreground text-sm">Inactive</p>
                <p className="font-bold text-2xl tabular-nums">
                  {counts.inactive}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {appId ? (
          <LinksTable
            appId={appId}
            isLoading={isPending}
            links={data?.links}
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
