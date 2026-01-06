'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePaginationStore } from '@/stores/pagination-store';

export function UsersOverviewCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-xs uppercase">Total Users</p>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="mt-1 h-4 w-32" />
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-xs uppercase">
            Daily Active Users
          </p>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="mt-1 h-4 w-32" />
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground text-xs uppercase">
              Online Users
            </p>
            <div className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </div>
          </div>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="mt-1 h-4 w-32" />
        </CardContent>
      </Card>
    </div>
  );
}

export function UsersCountryMapSkeleton() {
  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-[220px] w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

export function UsersDistributionCardSkeleton() {
  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-48" />
        <div className="h-[220px] space-y-3">
          {Array.from({ length: 4 }, (_, i) => `skeleton-dist-${i}`).map(
            (key) => (
              <Skeleton className="h-10 w-full" key={key} />
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function UsersTableSkeleton() {
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
