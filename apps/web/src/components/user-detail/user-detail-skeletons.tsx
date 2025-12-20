'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePaginationStore } from '@/stores/pagination-store';

export function UserDetailCardSkeleton() {
  return (
    <Card className="min-w-0 py-0">
      <CardContent className="min-w-0 space-y-4 p-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-muted-foreground text-sm uppercase">
            User Information
          </h2>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full">
              <Skeleton className="h-20 w-20 rounded-full" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-8 w-48" />
              <div className="flex min-w-0 items-center gap-2">
                <Skeleton className="size-4 shrink-0" />
                <Skeleton className="h-4 max-w-64 flex-1" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-muted-foreground text-xs uppercase">
              Geolocation
            </p>
            <div className="mt-1 space-y-2">
              <div className="flex items-center gap-1.5">
                <Skeleton className="size-4" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="flex items-center gap-1.5">
                <Skeleton className="size-4" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground text-xs uppercase">Device</p>
            <div className="mt-1 space-y-2">
              <div className="flex items-center gap-1.5">
                <Skeleton className="size-4" />
                <Skeleton className="h-5 w-28" />
              </div>
              <div className="flex items-center gap-1.5">
                <Skeleton className="size-4" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="size-3.5" />
              <p className="text-muted-foreground text-xs uppercase">
                Properties
              </p>
            </div>
            <div className="mt-1 space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function UserSessionsTableSkeleton() {
  const [isMounted, setIsMounted] = useState(false);
  const { pageSize } = usePaginationStore();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const skeletonCount = isMounted ? pageSize : 10;

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <div>
          <h2 className="font-semibold text-muted-foreground text-sm uppercase">
            Sessions & Events
          </h2>
          <p className="text-muted-foreground text-sm">
            User session history with events
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="space-y-2">
            {Array.from(
              { length: skeletonCount },
              (_, i) => `skeleton-table-${i}`
            ).map((key) => (
              <Skeleton className="h-10 w-full" key={key} />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-64" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function UserActivityCalendarSkeleton() {
  return (
    <Card className="min-w-0 py-0">
      <CardContent className="min-w-0 space-y-4 p-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-muted-foreground text-sm uppercase">
            Activity Calendar
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs uppercase">
              Total Sessions
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <Skeleton className="size-4" />
              <Skeleton className="h-5 w-12" />
            </div>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase">
              Avg Session Duration
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <Skeleton className="size-4" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs uppercase">
              First Seen
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <Skeleton className="size-4" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase">
              Last Activity
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <Skeleton className="size-4" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="flex flex-wrap gap-1">
            <Skeleton className="h-[168px] w-full rounded-[2px]" />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Less</span>
          <div className="flex gap-1">
            <div className="size-3 rounded-[2px] bg-muted" />
            <div className="size-3 rounded-[2px] bg-chart-2/20" />
            <div className="size-3 rounded-[2px] bg-chart-2/40" />
            <div className="size-3 rounded-[2px] bg-chart-2/60" />
            <div className="size-3 rounded-[2px] bg-chart-2" />
          </div>
          <span className="text-muted-foreground">More</span>
        </div>
      </CardContent>
    </Card>
  );
}
