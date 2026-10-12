'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { Suspense, useCallback } from 'react';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-page-header';
import { ErrorBoundary } from '@/components/error-boundary';
import { ExportButton } from '@/components/export-button';
import { RequireApp } from '@/components/require-app';
import { Card, CardContent } from '@/components/ui/card';
import {
  UsersActivityChart,
  UsersActivityChartSkeleton,
} from '@/components/users/users-activity-chart';
import { UsersAppVersionCard } from '@/components/users/users-app-version-card';
import { UsersCountryMapCard } from '@/components/users/users-country-map-card';
import { UsersDistributionCard } from '@/components/users/users-distribution-card';
import { UsersOverviewCards } from '@/components/users/users-overview-cards';
import {
  UsersAppVersionCardSkeleton,
  UsersCountryMapSkeleton,
  UsersDistributionCardSkeleton,
  UsersOverviewCardsSkeleton,
  UsersTableSkeleton,
} from '@/components/users/users-skeletons';
import { UsersTable } from '@/components/users/users-table';
import type {
  DeviceOverviewResponse,
  DeviceRetentionResponse,
} from '@/lib/api/types';
import {
  deviceOverviewQuery,
  deviceRetentionQuery,
  deviceTimeseriesQuery,
  getQueryClient,
} from '@/lib/queries';
import { useTimezoneStore } from '@/stores/timezone-store';

type UsersExportData = {
  exportedAt: string;
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    countries: Record<string, number>;
    platforms: Record<string, number>;
    appVersions: DeviceOverviewResponse['appVersionStats'];
    retention: DeviceRetentionResponse['summary'];
  };
  retentionCurve: DeviceRetentionResponse['data'];
  timeseries: Array<{
    date: string;
    totalUsers: number;
    dailyActiveUsers: number;
  }>;
};

function UsersExportButton() {
  const [appId] = useQueryState('app', parseAsString);
  const tz = useTimezoneStore((s) => s.timezone);

  const fetchUsersData = useCallback(
    async (startDate: string, endDate: string): Promise<UsersExportData> => {
      if (!appId) {
        throw new Error('No app selected');
      }

      const queryClient = getQueryClient();
      const range = { startDate, endDate };

      const [overview, totalTimeseries, dauTimeseries, retention] =
        await Promise.all([
          queryClient.fetchQuery(deviceOverviewQuery(appId, tz)),
          queryClient.fetchQuery(
            deviceTimeseriesQuery(appId, range, 'total', tz)
          ),
          queryClient.fetchQuery(
            deviceTimeseriesQuery(appId, range, 'dau', tz)
          ),
          queryClient.fetchQuery(deviceRetentionQuery(appId, range, tz)),
        ]);

      const dauByDate = new Map(
        dauTimeseries.data.map((point) => [point.date, point.activeUsers ?? 0])
      );
      return {
        exportedAt: new Date().toISOString(),
        period: {
          startDate,
          endDate,
        },
        summary: {
          countries: overview.countryStats,
          platforms: overview.platformStats,
          appVersions: overview.appVersionStats,
          retention: retention.summary,
        },
        retentionCurve: retention.data,
        timeseries: totalTimeseries.data.map((point) => ({
          date: point.date,
          totalUsers: point.totalUsers ?? 0,
          dailyActiveUsers: dauByDate.get(point.date) ?? 0,
        })),
      };
    },
    [appId, tz]
  );

  if (!appId) {
    return null;
  }

  return <ExportButton fetchData={fetchUsersData} filePrefix="users" />;
}

export default function UsersPage() {
  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <DashboardPageHeader
          actions={<UsersExportButton />}
          description="Track and analyze users in your application"
          title="Users"
        />

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

        <ErrorBoundary>
          <Suspense fallback={<UsersDistributionCardSkeleton />}>
            <UsersDistributionCard />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<UsersAppVersionCardSkeleton />}>
            <UsersAppVersionCard />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<UsersCountryMapSkeleton />}>
            <UsersCountryMapCard />
          </Suspense>
        </ErrorBoundary>

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
