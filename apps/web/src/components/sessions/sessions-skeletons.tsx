'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePaginationStore } from '@/stores/pagination-store';

export function SessionsOverviewCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-xs uppercase">
            Total Sessions
          </p>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="mt-1 h-4 w-32" />
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-xs uppercase">
            Daily Sessions
          </p>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="mt-1 h-4 w-32" />
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-xs uppercase">Bounce Rate</p>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="mt-1 h-4 w-32" />
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-xs uppercase">
            Average Session Duration
          </p>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="mt-1 h-4 w-32" />
        </CardContent>
      </Card>
    </div>
  );
}

export function SessionsTableSkeleton() {
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
