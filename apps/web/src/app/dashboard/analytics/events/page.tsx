'use client';

import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  EventsActivityChart,
  EventsActivityChartSkeleton,
} from '@/components/events/events-activity-chart';
import { EventsOverviewCards } from '@/components/events/events-overview-cards';
import {
  EventsOverviewCardsSkeleton,
  EventsTableSkeleton,
  TopEventsCardSkeleton,
  TopScreensCardSkeleton,
} from '@/components/events/events-skeletons';
import { EventsTable } from '@/components/events/events-table';
import { TopEventsCard } from '@/components/events/top-events-card';
import { TopScreensCard } from '@/components/events/top-screens-card';
import { RequireApp } from '@/components/require-app';
import { Card, CardContent } from '@/components/ui/card';

export default function EventsPage() {
  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="font-bold font-sans text-2xl">Events</h1>
          <p className="font-sans text-muted-foreground text-sm">
            Track and analyze events in your application
          </p>
        </div>

        <ErrorBoundary>
          <Suspense fallback={<EventsOverviewCardsSkeleton />}>
            <EventsOverviewCards />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<TopEventsCardSkeleton />}>
            <TopEventsCard />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<TopScreensCardSkeleton />}>
            <TopScreensCard />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<EventsActivityChartSkeleton />}>
            <EventsActivityChart />
          </Suspense>
        </ErrorBoundary>

        <Card className="py-0">
          <CardContent className="space-y-4 p-4">
            <div>
              <h2 className="font-semibold text-muted-foreground text-sm uppercase">
                All Events
              </h2>
              <p className="text-muted-foreground text-sm">
                Complete list of all events
              </p>
            </div>

            <ErrorBoundary>
              <Suspense fallback={<EventsTableSkeleton />}>
                <EventsTable />
              </Suspense>
            </ErrorBoundary>
          </CardContent>
        </Card>
      </div>
    </RequireApp>
  );
}
