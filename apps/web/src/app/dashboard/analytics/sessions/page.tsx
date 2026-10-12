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
import {
  getQueryClient,
  sessionOverviewQuery,
  sessionTimeseriesQuery,
} from '@/lib/queries';
import { useTimezoneStore } from '@/stores/timezone-store';

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
  const tz = useTimezoneStore((s) => s.timezone);

  const fetchSessionsData = useCallback(
    async (startDate: string, endDate: string): Promise<SessionsExportData> => {
      if (!appId) {
        throw new Error('No app selected');
      }

      const queryClient = getQueryClient();
      const range = { startDate, endDate };

      const [overview, sessionsTs, durationTs, bounceTs] = await Promise.all([
        queryClient.fetchQuery(sessionOverviewQuery(appId, tz)),
        queryClient.fetchQuery(
          sessionTimeseriesQuery(appId, range, 'daily_sessions', tz)
        ),
        queryClient.fetchQuery(
          sessionTimeseriesQuery(appId, range, 'avg_duration', tz)
        ),
        queryClient.fetchQuery(
          sessionTimeseriesQuery(appId, range, 'bounce_rate', tz)
        ),
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
    [appId, tz]
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
