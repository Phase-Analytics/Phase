'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePaginationStore } from '@/stores/pagination-store';

export function EventsOverviewCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-xs uppercase">
            Total Events
          </p>
          <Skeleton className="h-8 w-24" />
          <div className="mt-1 flex items-center gap-1 text-xs">
            <Skeleton className="h-4 w-12" />
            <span className="text-muted-foreground">from yesterday</span>
          </div>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-xs uppercase">
            Daily Events
          </p>
          <Skeleton className="h-8 w-24" />
          <div className="mt-1 flex items-center gap-1 text-xs">
            <Skeleton className="h-4 w-12" />
            <span className="text-muted-foreground">from yesterday</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function TopEventsCardSkeleton() {
  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <div>
          <h2 className="font-semibold text-lg">Top Events</h2>
          <p className="text-muted-foreground text-sm">
            Most frequently triggered events
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => `top-events-skeleton-${i}`).map(
            (key) => (
              <Skeleton className="h-9 w-full" key={key} />
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function TopScreensCardSkeleton() {
  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <div>
          <h2 className="font-semibold text-lg">Top Screens</h2>
          <p className="text-muted-foreground text-sm">
            Most frequently viewed screens
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => `top-screens-skeleton-${i}`).map(
            (key) => (
              <Skeleton className="h-9 w-full" key={key} />
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function EventsTableSkeleton() {
  const [isMounted, setIsMounted] = useState(false);
  const { pageSize } = usePaginationStore();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const skeletonCount = isMounted ? pageSize : 10;

  return (
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
  );
}
