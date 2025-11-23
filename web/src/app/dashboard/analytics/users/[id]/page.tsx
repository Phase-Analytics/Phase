'use client';

import {
  AndroidIcon,
  AnonymousIcon,
  AppleIcon,
  BrowserIcon,
  Calendar03Icon,
  ComputerPhoneSyncIcon,
  Flag02Icon,
  InformationCircleIcon,
  UserSquareIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ColumnDef } from '@tanstack/react-table';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import { use } from 'react';
import { RequireApp } from '@/components/require-app';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
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
      return null;
    }
    const date = new Date(dateStr);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })} UTC`;
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

        {deviceLoading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="py-0 md:col-span-2 lg:col-span-3">
              <CardContent className="flex items-center gap-4 p-4">
                <Skeleton className="size-12" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-64" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!deviceLoading && device && (
          <>
            {/* User Information Card */}
            <Card className="py-0">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    className="size-5 text-primary"
                    icon={UserSquareIcon}
                  />
                  <h2 className="font-semibold text-lg">User Information</h2>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-muted-foreground text-sm">User ID</p>
                    <div className="mt-1 flex items-center gap-2">
                      <CopyButton
                        className="size-4 [&_svg]:size-4"
                        content={device.deviceId}
                        variant="ghost"
                      />
                      <p
                        className="truncate font-mono font-semibold text-sm"
                        title={device.deviceId}
                      >
                        {device.deviceId}
                      </p>
                    </div>
                  </div>
                  {device.identifier && (
                    <div>
                      <p className="text-muted-foreground text-sm">
                        Identifier
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <CopyButton
                          className="size-4 [&_svg]:size-4"
                          content={device.identifier}
                          variant="ghost"
                        />
                        <p
                          className="truncate font-mono font-semibold text-sm"
                          title={device.identifier}
                        >
                          {device.identifier}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground text-sm">First Seen</p>
                    <div className="mt-1 flex items-center gap-2">
                      <HugeiconsIcon className="size-4" icon={Calendar03Icon} />
                      <p className="font-medium text-sm">
                        {formatDate(device.firstSeen)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">
                      Last Activity
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <HugeiconsIcon className="size-4" icon={Calendar03Icon} />
                      <p className="font-medium text-sm">
                        {formatDate(device.lastActivityAt) ||
                          formatDate(device.firstSeen)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Device Information Card */}
            <Card className="py-0">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    className="size-5 text-primary"
                    icon={ComputerPhoneSyncIcon}
                  />
                  <h2 className="font-semibold text-lg">Device Information</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground text-sm">Model</p>
                    <div className="mt-1 flex items-center gap-2">
                      <HugeiconsIcon
                        className="size-4"
                        icon={ComputerPhoneSyncIcon}
                      />
                      <p className="font-medium text-sm">
                        {device.model || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Platform</p>
                    <div className="mt-1 flex items-center gap-2">
                      <HugeiconsIcon
                        className="size-4"
                        icon={getPlatformIcon(device.platform)}
                      />
                      <p className="font-medium text-sm">
                        {getPlatformLabel(device.platform)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">OS Version</p>
                    <div className="mt-1 flex items-center gap-2">
                      <HugeiconsIcon
                        className="size-4"
                        icon={InformationCircleIcon}
                      />
                      <p className="font-medium text-sm">
                        {device.osVersion || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">App Version</p>
                    <div className="mt-1 flex items-center gap-2">
                      <HugeiconsIcon
                        className="size-4"
                        icon={InformationCircleIcon}
                      />
                      <p className="font-medium text-sm">
                        {device.appVersion || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Country</p>
                    <div className="mt-1 flex items-center gap-2">
                      <HugeiconsIcon className="size-4" icon={Flag02Icon} />
                      <p className="font-medium text-sm">
                        {device.country || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {!(deviceLoading || device) && (
          <Card className="py-0">
            <CardContent className="p-12 text-center">
              <HugeiconsIcon
                className="mx-auto mb-4 size-16 text-muted-foreground"
                icon={UserSquareIcon}
              />
              <p className="text-muted-foreground">User not found</p>
            </CardContent>
          </Card>
        )}

        {/* Sessions Table */}
        <Card className="py-0">
          <CardContent className="space-y-4 p-4">
            <div>
              <h2 className="font-semibold text-lg">Sessions</h2>
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
