'use client';

import {
  AndroidIcon,
  AnonymousIcon,
  AppleIcon,
  BrowserIcon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ColumnDef } from '@tanstack/react-table';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import { use } from 'react';
import { RequireApp } from '@/components/require-app';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTableServer } from '@/components/ui/data-table-server';
import { Skeleton } from '@/components/ui/skeleton';
import type { Session } from '@/lib/api/types';
import { useDevice, useSessions } from '@/lib/queries';

const formatDurationTable = (startedAt: string, lastActivityAt: string) => {
  const start = new Date(startedAt).getTime();
  const end = new Date(lastActivityAt).getTime();
  const seconds = Math.floor((end - start) / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const columns: ColumnDef<Session>[] = [
  {
    accessorKey: 'sessionId',
    header: 'Session ID',
    size: 400,
    cell: ({ row }) => (
      <div
        className="max-w-xs truncate font-mono text-xs lg:max-w-sm"
        title={row.getValue('sessionId')}
      >
        {row.getValue('sessionId')}
      </div>
    ),
  },
  {
    accessorKey: 'startedAt',
    header: 'Date',
    size: 250,
    cell: ({ row }) => {
      const date = new Date(row.getValue('startedAt'));
      return (
        <div className="text-sm">
          {date.toLocaleDateString()}{' '}
          {date.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      );
    },
  },
  {
    accessorKey: 'lastActivityAt',
    header: 'Duration',
    size: 150,
    cell: ({ row }) => {
      const duration = formatDurationTable(
        row.original.startedAt,
        row.original.lastActivityAt
      );
      return <div className="text-sm">{duration}</div>;
    },
  },
];

type UserPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function UserPage({ params }: UserPageProps) {
  const { id } = use(params);
  const [appId] = useQueryState('app', parseAsString);
  const [page] = useQueryState('page', parseAsInteger.withDefault(1));
  const [pageSize] = useQueryState('pageSize', parseAsInteger.withDefault(10));

  const { data: device, isPending: deviceLoading } = useDevice(id, appId || '');
  const { data: sessionsData, isPending: sessionsLoading } = useSessions(
    appId || '',
    {
      page: page.toString(),
      pageSize: pageSize.toString(),
      deviceId: id,
    }
  );

  const getPlatformIcon = (platform: string | null) => {
    switch (platform) {
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

  const getPlatformLabel = (platform: string | null) => {
    switch (platform) {
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) {
      return 'N/A';
    }
    const date = new Date(dateStr);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="font-bold text-2xl">User Details</h1>
          <p className="text-muted-foreground text-sm">
            View detailed information about this user
          </p>
        </div>

        <Card className="py-0">
          <CardContent className="space-y-4 p-4">
            <div>
              <h2 className="font-semibold text-lg">User Information</h2>
              <p className="text-muted-foreground text-sm">
                Basic information about this user
              </p>
            </div>

            {deviceLoading && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-64" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-40" />
                </div>
              </div>
            )}

            {!deviceLoading && device && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">User ID</p>
                  <p className="break-all font-mono text-sm">
                    {device.deviceId}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">Identifier</p>
                  {device.identifier ? (
                    <p className="text-sm">{device.identifier}</p>
                  ) : (
                    <p className="text-muted-foreground text-sm">Anonymous</p>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">Platform</p>
                  <Badge
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs"
                    variant="outline"
                  >
                    <HugeiconsIcon
                      className="size-3.5"
                      icon={getPlatformIcon(device.platform)}
                    />
                    {getPlatformLabel(device.platform)}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">Country</p>
                  <p className="text-sm">{device.country || 'Unknown'}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">Device Model</p>
                  <p className="text-sm">{device.model || 'Unknown'}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">OS Version</p>
                  <p className="text-sm">{device.osVersion || 'Unknown'}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">App Version</p>
                  <p className="text-sm">{device.appVersion || 'Unknown'}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">
                    Total Sessions
                  </p>
                  <p className="font-semibold text-lg">
                    {device.totalSessions.toLocaleString()}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">First Seen</p>
                  <p className="text-sm">{formatDate(device.firstSeen)}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">Last Activity</p>
                  <p className="text-sm">{formatDate(device.lastActivityAt)}</p>
                </div>
              </div>
            )}

            {!(deviceLoading || device) && (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <HugeiconsIcon
                  className="mx-auto mb-2 size-12 text-muted-foreground"
                  icon={UserIcon}
                />
                <p className="text-muted-foreground">User not found</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardContent className="space-y-4 p-4">
            <div>
              <h2 className="font-semibold text-lg">User Sessions</h2>
              <p className="text-muted-foreground text-sm">
                All sessions for this user
              </p>
            </div>

            <DataTableServer
              columns={columns}
              data={sessionsData?.sessions || []}
              isLoading={sessionsLoading}
              pagination={
                sessionsData?.pagination || {
                  total: 0,
                  page: 1,
                  pageSize: 10,
                  totalPages: 0,
                }
              }
            />
          </CardContent>
        </Card>
      </div>
    </RequireApp>
  );
}
