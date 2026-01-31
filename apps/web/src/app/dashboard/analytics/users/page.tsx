'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { Suspense, useCallback } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { ExportButton } from '@/components/export-button';
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
import { buildQueryString, fetchApi } from '@/lib/api/client';
import type {
  DeviceOverviewResponse,
  DeviceTimeseriesResponse,
} from '@/lib/api/types';
import { cacheConfig, getQueryClient, queryKeys } from '@/lib/queries';

type UsersExportData = {
  exportedAt: string;
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    countries: Record<string, number>;
    cities: Record<string, { count: number; country: string }>;
    platforms: Record<string, number>;
  };
  timeseries: {
    totalUsers: Array<{ date: string; value: number }>;
    dailyActiveUsers: Array<{ date: string; value: number }>;
  };
};

function UsersExportButton() {
  const [appId] = useQueryState('app', parseAsString);

  const fetchUsersData = useCallback(
    async (startDate: string, endDate: string): Promise<UsersExportData> => {
      if (!appId) {
        throw new Error('No app selected');
      }

      const queryClient = getQueryClient();

      const [overview, totalTimeseries, dauTimeseries] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: queryKeys.devices.overview(appId),
          queryFn: () =>
            fetchApi<DeviceOverviewResponse>(
              `/web/devices/overview${buildQueryString({ appId })}`
            ),
          ...cacheConfig.overview,
        }),
        queryClient.fetchQuery({
          queryKey: queryKeys.devices.timeseries(appId, {
            startDate,
            endDate,
            metric: 'total',
          }),
          queryFn: () =>
            fetchApi<DeviceTimeseriesResponse>(
              `/web/devices/timeseries${buildQueryString({
                appId,
                startDate,
                endDate,
                metric: 'total',
              })}`
            ),
          ...cacheConfig.timeseries,
        }),
        queryClient.fetchQuery({
          queryKey: queryKeys.devices.timeseries(appId, {
            startDate,
            endDate,
            metric: 'dau',
          }),
          queryFn: () =>
            fetchApi<DeviceTimeseriesResponse>(
              `/web/devices/timeseries${buildQueryString({
                appId,
                startDate,
                endDate,
                metric: 'dau',
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
          countries: overview.countryStats,
          cities:
            (
              overview as {
                cityStats?: Record<string, { count: number; country: string }>;
              }
            ).cityStats ?? {},
          platforms: overview.platformStats,
        },
        timeseries: {
          totalUsers: totalTimeseries.data.map((point) => ({
            date: point.date,
            value: point.totalUsers ?? 0,
          })),
          dailyActiveUsers: dauTimeseries.data.map((point) => ({
            date: point.date,
            value: point.activeUsers ?? 0,
          })),
        },
      };
    },
    [appId]
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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-bold font-sans text-2xl">Users</h1>
            <p className="font-sans text-muted-foreground text-sm">
              Track and analyze users in your application
            </p>
          </div>
          <UsersExportButton />
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
