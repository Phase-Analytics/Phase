'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { Suspense, useCallback } from 'react';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-page-header';
import { ErrorBoundary } from '@/components/error-boundary';
import { ExportButton } from '@/components/export-button';
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
import {
  UsersRetentionChart,
  UsersRetentionChartSkeleton,
} from '@/components/users/users-retention';
import { buildQueryString, fetchApi } from '@/lib/api/client';
import type {
  SessionOverviewResponse,
  SessionTimeseriesResponse,
} from '@/lib/api/types';
import { cacheConfig, getQueryClient, queryKeys } from '@/lib/queries';

type SessionsExportData = {
  exportedAt: string;
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalSessions: number;
  };
  timeseries: Array<{
    date: string;
    dailySessions: number;
    avgDuration: number | null;
    bounceRate: number | null;
  }>;
};

function SessionsExportButton() {
  const [appId] = useQueryState('app', parseAsString);

  const fetchSessionsData = useCallback(
    async (startDate: string, endDate: string): Promise<SessionsExportData> => {
      if (!appId) {
        throw new Error('No app selected');
      }

      const queryClient = getQueryClient();

      const [overview, sessionsTs, durationTs, bounceTs] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: queryKeys.sessions.overview(appId),
          queryFn: () =>
            fetchApi<SessionOverviewResponse>(
              `/web/sessions/overview${buildQueryString({ appId })}`
            ),
          ...cacheConfig.overview,
        }),
        queryClient.fetchQuery({
          queryKey: queryKeys.sessions.timeseries(appId, {
            startDate,
            endDate,
            metric: 'daily_sessions',
          }),
          queryFn: () =>
            fetchApi<SessionTimeseriesResponse>(
              `/web/sessions/timeseries${buildQueryString({
                appId,
                startDate,
                endDate,
                metric: 'daily_sessions',
              })}`
            ),
          ...cacheConfig.timeseries,
        }),
        queryClient.fetchQuery({
          queryKey: queryKeys.sessions.timeseries(appId, {
            startDate,
            endDate,
            metric: 'avg_duration',
          }),
          queryFn: () =>
            fetchApi<SessionTimeseriesResponse>(
              `/web/sessions/timeseries${buildQueryString({
                appId,
                startDate,
                endDate,
                metric: 'avg_duration',
              })}`
            ),
          ...cacheConfig.timeseries,
        }),
        queryClient.fetchQuery({
          queryKey: queryKeys.sessions.timeseries(appId, {
            startDate,
            endDate,
            metric: 'bounce_rate',
          }),
          queryFn: () =>
            fetchApi<SessionTimeseriesResponse>(
              `/web/sessions/timeseries${buildQueryString({
                appId,
                startDate,
                endDate,
                metric: 'bounce_rate',
              })}`
            ),
          ...cacheConfig.timeseries,
        }),
      ]);

      const durationByDate = new Map(
        durationTs.data.map((point) => [point.date, point.avgDuration ?? null])
      );
      const bounceByDate = new Map(
        bounceTs.data.map((point) => [point.date, point.bounceRate ?? null])
      );

      return {
        exportedAt: new Date().toISOString(),
        period: {
          startDate,
          endDate,
        },
        summary: {
          totalSessions: overview.totalSessions,
        },
        timeseries: sessionsTs.data.map((point) => ({
          date: point.date,
          dailySessions: point.dailySessions ?? 0,
          avgDuration: durationByDate.get(point.date) ?? null,
          bounceRate: bounceByDate.get(point.date) ?? null,
        })),
      };
    },
    [appId]
  );

  if (!appId) {
    return null;
  }

  return <ExportButton fetchData={fetchSessionsData} filePrefix="sessions" />;
}

export default function SessionsPage() {
  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <DashboardPageHeader
          actions={<SessionsExportButton />}
          description="Track and analyze user sessions in your application"
          title="Sessions"
        />

        <ErrorBoundary>
          <Suspense fallback={<SessionsOverviewCardsSkeleton />}>
            <SessionsOverviewCards />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<UsersRetentionChartSkeleton />}>
            <UsersRetentionChart />
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
              <h2 className="font-semibold text-muted-foreground text-sm uppercase">
                All Sessions
              </h2>
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
