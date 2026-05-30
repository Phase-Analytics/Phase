'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { Suspense, useCallback } from 'react';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-page-header';
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
import { ExportButton } from '@/components/export-button';
import { RequireApp } from '@/components/require-app';
import { Card, CardContent } from '@/components/ui/card';
import { buildQueryString, fetchApi } from '@/lib/api/client';
import type {
  EventOverviewResponse,
  EventTimeseriesResponse,
  TopEventsResponse,
} from '@/lib/api/types';
import { cacheConfig, getQueryClient, queryKeys } from '@/lib/queries';

type ActivityExportData = {
  exportedAt: string;
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalEvents: number;
    topEvents: Array<{ name: string; count: number }>;
    topScreens: Array<{ name: string; count: number }>;
  };
  timeseries: Array<{
    date: string;
    dailyEvents: number;
  }>;
};

function ActivityExportButton() {
  const [appId] = useQueryState('app', parseAsString);

  const fetchActivityData = useCallback(
    async (startDate: string, endDate: string): Promise<ActivityExportData> => {
      if (!appId) {
        throw new Error('No app selected');
      }

      const queryClient = getQueryClient();

      const [overview, topEvents, eventsTs] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: queryKeys.events.overview(appId),
          queryFn: () =>
            fetchApi<EventOverviewResponse>(
              `/web/events/overview${buildQueryString({ appId })}`
            ),
          ...cacheConfig.overview,
        }),
        queryClient.fetchQuery({
          queryKey: queryKeys.events.top(appId, { startDate, endDate }),
          queryFn: () =>
            fetchApi<
              TopEventsResponse & {
                screens: Array<{ name: string; count: number }>;
              }
            >(
              `/web/events/top${buildQueryString({ appId, startDate, endDate })}`
            ),
          ...cacheConfig.overview,
        }),
        queryClient.fetchQuery({
          queryKey: queryKeys.events.timeseries(appId, { startDate, endDate }),
          queryFn: () =>
            fetchApi<EventTimeseriesResponse>(
              `/web/events/timeseries${buildQueryString({
                appId,
                startDate,
                endDate,
              })}`
            ),
          ...cacheConfig.timeseries,
        }),
      ]);

      return {
        exportedAt: new Date().toISOString(),
        period: {
          startDate,
          endDate,
        },
        summary: {
          totalEvents: overview.totalEvents,
          topEvents: topEvents.events,
          topScreens: topEvents.screens ?? [],
        },
        timeseries: eventsTs.data.map((point) => ({
          date: point.date,
          dailyEvents: point.dailyEvents,
        })),
      };
    },
    [appId]
  );

  if (!appId) {
    return null;
  }

  return <ExportButton fetchData={fetchActivityData} filePrefix="activity" />;
}

export default function EventsPage() {
  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <DashboardPageHeader
          actions={<ActivityExportButton />}
          description="Track and analyze events in your application"
          title="Activity"
        />

        <ErrorBoundary>
          <Suspense fallback={<EventsOverviewCardsSkeleton />}>
            <EventsOverviewCards />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<EventsActivityChartSkeleton />}>
            <EventsActivityChart />
          </Suspense>
        </ErrorBoundary>

        <div className="grid gap-4 md:grid-cols-2">
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
        </div>

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
