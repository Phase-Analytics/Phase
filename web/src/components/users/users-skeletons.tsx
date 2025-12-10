'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePaginationStore } from '@/stores/pagination-store';

export function UsersOverviewCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-xs uppercase">Total Users</p>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="mt-1 h-3 w-32" />
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-xs uppercase">
            Daily Active Users
          </p>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="mt-1 h-3 w-32" />
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
          <Skeleton className="h-8 w-20" />
          <Skeleton className="mt-1 h-3 w-32" />
        </CardContent>
      </Card>
    </div>
  );
}

export function UsersPlatformDistributionSkeleton() {
  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <Tabs value="platform">
          <TabsList className="h-8 gap-1">
            <TabsTrigger
              className="text-muted-foreground text-xs uppercase"
              value="platform"
            >
              <span className="sm:hidden">Platforms</span>
              <span className="hidden sm:inline">Platform Distribution</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-muted-foreground text-sm">
          User distribution across platforms
        </p>

        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => `skeleton-platform-${i}`).map(
            (key) => (
              <Skeleton className="h-9 w-full" key={key} />
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function UsersTopCountriesSkeleton() {
  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <Tabs value="country">
          <TabsList className="h-8 gap-1">
            <TabsTrigger
              className="text-muted-foreground text-xs uppercase"
              value="country"
            >
              <span className="sm:hidden">Countries</span>
              <span className="hidden sm:inline">Countries</span>
            </TabsTrigger>
            <TabsTrigger
              className="text-muted-foreground text-xs uppercase"
              value="city"
            >
              <span className="sm:hidden">Cities</span>
              <span className="hidden sm:inline">Cities</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-muted-foreground text-sm">
          User distribution by country
        </p>

        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => `skeleton-country-${i}`).map(
            (key) => (
              <Skeleton className="h-9 w-full" key={key} />
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
