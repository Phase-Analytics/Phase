'use client';

import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { RequireApp } from '@/components/require-app';
import { Card, CardContent } from '@/components/ui/card';
import {
  UsersActivityChart,
  UsersActivityChartSkeleton,
} from '@/components/users/users-activity-chart';
import { UsersCountryMapCard } from '@/components/users/users-country-map-card';
import { UsersDistributionCard } from '@/components/users/users-distribution-card';
import { UsersOverviewCards } from '@/components/users/users-overview-cards';
import {
  UsersCountryMapSkeleton,
  UsersDistributionCardSkeleton,
  UsersOverviewCardsSkeleton,
  UsersTableSkeleton,
} from '@/components/users/users-skeletons';
import { UsersTable } from '@/components/users/users-table';

export default function UsersPage() {
  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="font-bold font-sans text-2xl">Users</h1>
          <p className="font-sans text-muted-foreground text-sm">
            Track and analyze users in your application
          </p>
        </div>

        <ErrorBoundary>
          <Suspense fallback={<UsersOverviewCardsSkeleton />}>
            <UsersOverviewCards />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<UsersActivityChartSkeleton />}>
            <UsersActivityChart />
          </Suspense>
        </ErrorBoundary>

        <div className="grid gap-4 md:grid-cols-2">
          <ErrorBoundary>
            <Suspense fallback={<UsersDistributionCardSkeleton />}>
              <UsersDistributionCard />
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary>
            <Suspense fallback={<UsersCountryMapSkeleton />}>
              <UsersCountryMapCard />
            </Suspense>
          </ErrorBoundary>
        </div>

        <Card className="py-0">
          <CardContent className="space-y-4 p-4">
            <div>
              <h2 className="font-semibold text-muted-foreground text-sm uppercase">
                All Users
              </h2>
              <p className="text-muted-foreground text-sm">
                Complete list of all users
              </p>
            </div>

            <ErrorBoundary>
              <Suspense fallback={<UsersTableSkeleton />}>
                <UsersTable />
              </Suspense>
            </ErrorBoundary>
          </CardContent>
        </Card>
      </div>
    </RequireApp>
  );
}
