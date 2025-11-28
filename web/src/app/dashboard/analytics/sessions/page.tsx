'use client';

import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { RequireApp } from '@/components/require-app';
import {
  SessionsActivityChart,
  SessionsActivityChartSkeleton,
} from '@/components/sessions/sessions-activity-chart';
import { SessionsOverviewCards } from '@/components/sessions/sessions-overview-cards';
import {
  SessionsOverviewCardsSkeleton,
  SessionsTableSkeleton,
} from '@/components/sessions/sessions-skeletons';
import { SessionsTable } from '@/components/sessions/sessions-table';
import { Card, CardContent } from '@/components/ui/card';

export default function SessionsPage() {
  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="font-bold text-2xl">Sessions</h1>
          <p className="text-muted-foreground text-sm">
            Track and analyze user sessions in your application
          </p>
        </div>

        <ErrorBoundary>
          <Suspense fallback={<SessionsOverviewCardsSkeleton />}>
            <SessionsOverviewCards />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<SessionsActivityChartSkeleton />}>
            <SessionsActivityChart />
          </Suspense>
        </ErrorBoundary>

        <Card className="py-0">
          <CardContent className="space-y-4 p-4">
            <div>
              <h2 className="font-semibold text-lg">All Sessions</h2>
              <p className="text-muted-foreground text-sm">
                Complete list of all sessions
              </p>
            </div>

            <ErrorBoundary>
              <Suspense fallback={<SessionsTableSkeleton />}>
                <SessionsTable />
              </Suspense>
            </ErrorBoundary>
          </CardContent>
        </Card>
      </div>
    </RequireApp>
  );
}
