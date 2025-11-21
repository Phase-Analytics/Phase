'use client';

import {
  AndroidIcon,
  AnonymousIcon,
  AppleIcon,
  BrowserIcon,
  ChartDownIcon,
  ChartUpIcon,
  ComputerPhoneSyncIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ColumnDef } from '@tanstack/react-table';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import { RequireApp } from '@/components/require-app';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTableServer } from '@/components/ui/data-table-server';
import { Skeleton } from '@/components/ui/skeleton';
import type { Device } from '@/lib/api/types';
import { useDeviceLive, useDeviceOverview, useDevices } from '@/lib/queries';
import { cn } from '@/lib/utils';

const columns: ColumnDef<Device>[] = [
  {
    accessorKey: 'deviceId',
    header: 'ID',
    size: 400,
    cell: ({ row }) => (
      <div
        className="max-w-xs truncate font-mono text-xs lg:max-w-sm"
        title={row.getValue('deviceId')}
      >
        {row.getValue('deviceId')}
      </div>
    ),
  },
  {
    accessorKey: 'identifier',
    header: 'Identifier',
    size: 400,
    cell: ({ row }) => {
      const identifier = row.getValue('identifier') as string | null;
      return (
        <div
          className="max-w-xs truncate lg:max-w-sm"
          title={identifier || 'Anonymous'}
        >
          {identifier ? (
            <span className="text-sm">{identifier}</span>
          ) : (
            <span className="text-muted-foreground text-sm">Anonymous</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'platform',
    header: 'Platform',
    size: 120,
    cell: ({ row }) => {
      const platform = row.getValue('platform') as string | null;

      const getPlatformIcon = (p: string) => {
        switch (p) {
          case 'android':
            return AndroidIcon;
          case 'ios':
            return AppleIcon;
          case 'web':
            return BrowserIcon;
          default:
            return AnonymousIcon;
        }
      };

      const getPlatformLabel = (p: string) => {
        switch (p) {
          case 'android':
            return 'Android';
          case 'ios':
            return 'iOS';
          case 'web':
            return 'Web';
          default:
            return 'Unknown';
        }
      };

      return platform ? (
        <Badge
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs"
          variant="outline"
        >
          <HugeiconsIcon
            className="size-3.5"
            icon={getPlatformIcon(platform)}
          />
          {getPlatformLabel(platform)}
        </Badge>
      ) : (
        <Badge
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs"
          variant="outline"
        >
          <HugeiconsIcon className="size-3.5" icon={AnonymousIcon} />
          Unknown
        </Badge>
      );
    },
  },
];

export default function UsersPage() {
  const [appId] = useQueryState('app', parseAsString);
  const [page] = useQueryState('page', parseAsInteger.withDefault(1));
  const [pageSize] = useQueryState('pageSize', parseAsInteger.withDefault(5));
  const [search] = useQueryState('search', parseAsString.withDefault(''));
  const [filter] = useQueryState('filter', parseAsString.withDefault(''));

  const { data: overview, isPending: overviewLoading } = useDeviceOverview(
    appId || ''
  );
  const { data: liveData, isPending: liveLoading } = useDeviceLive(appId || '');
  const { data: devicesData, isPending: devicesLoading } = useDevices(
    appId || '',
    {
      page: page.toString(),
      pageSize: pageSize.toString(),
      identifier: search || undefined,
      platform: filter || undefined,
    }
  );

  const getChangeColor = (change: number) => {
    if (change === 0) {
      return 'text-muted-foreground';
    }
    return change > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="font-bold text-2xl">Users</h1>
          <p className="text-muted-foreground text-sm">
            Track and analyze users in your application
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Total Users */}
          <Card className="py-0">
            <CardContent className="p-4">
              {overviewLoading || liveLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground text-sm">Total Users</p>
                    <div className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 dark:border-green-900/50 dark:bg-green-950/50">
                      <div className="relative flex size-1.5">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
                      </div>
                      <span className="font-medium text-[10px] text-green-700 dark:text-green-400">
                        {liveData?.activeNow.toLocaleString() || 0} online
                      </span>
                    </div>
                  </div>
                  <p className="font-bold text-3xl">
                    {overview?.totalDevices.toLocaleString() || 0}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    {(overview?.totalDevicesChange24h || 0) !== 0 && (
                      <HugeiconsIcon
                        className={cn(
                          'size-3',
                          getChangeColor(overview?.totalDevicesChange24h || 0)
                        )}
                        icon={
                          (overview?.totalDevicesChange24h || 0) > 0
                            ? ChartUpIcon
                            : ChartDownIcon
                        }
                      />
                    )}
                    <span
                      className={cn(
                        'font-medium',
                        getChangeColor(overview?.totalDevicesChange24h || 0)
                      )}
                    >
                      {Math.abs(overview?.totalDevicesChange24h || 0)}%
                    </span>
                    <span className="text-muted-foreground">
                      from yesterday
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Daily Active Users */}
          <Card className="py-0">
            <CardContent className="p-4">
              {overviewLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm">
                    Daily Active Users
                  </p>
                  <p className="font-bold text-3xl">
                    {overview?.activeDevices24h.toLocaleString() || 0}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    {(overview?.activeDevicesChange24h || 0) !== 0 && (
                      <HugeiconsIcon
                        className={cn(
                          'size-3',
                          getChangeColor(overview?.activeDevicesChange24h || 0)
                        )}
                        icon={
                          (overview?.activeDevicesChange24h || 0) > 0
                            ? ChartUpIcon
                            : ChartDownIcon
                        }
                      />
                    )}
                    <span
                      className={cn(
                        'font-medium',
                        getChangeColor(overview?.activeDevicesChange24h || 0)
                      )}
                    >
                      {Math.abs(overview?.activeDevicesChange24h || 0)}%
                    </span>
                    <span className="text-muted-foreground">
                      from yesterday
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* All Users List */}
        <Card className="py-0">
          <CardContent className="space-y-4 p-4">
            <div>
              <h2 className="font-semibold text-lg">All Users</h2>
              <p className="text-muted-foreground text-sm">
                Complete list of all users
              </p>
            </div>

            <DataTableServer
              columns={columns}
              data={devicesData?.devices || []}
              filterAllIcon={ComputerPhoneSyncIcon}
              filterIcon={ComputerPhoneSyncIcon}
              filterKey="platform"
              filterOptions={[
                { label: 'Android', value: 'android', icon: AndroidIcon },
                { label: 'iOS', value: 'ios', icon: AppleIcon },
                { label: 'Web', value: 'web', icon: BrowserIcon },
                { label: 'Unknown', value: 'unknown', icon: AnonymousIcon },
              ]}
              filterPlaceholder="Platform"
              isLoading={devicesLoading}
              pagination={
                devicesData?.pagination || {
                  total: 0,
                  page: 1,
                  pageSize: 5,
                  totalPages: 0,
                }
              }
              searchKey="identifier"
              searchPlaceholder="Search users by ID or identifier..."
            />
          </CardContent>
        </Card>
      </div>
    </RequireApp>
  );
}
