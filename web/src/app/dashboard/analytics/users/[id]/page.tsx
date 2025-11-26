'use client';

import {
  AndroidIcon,
  AnonymousIcon,
  AppleIcon,
  ArrowTurnBackwardIcon,
  BrowserIcon,
  Calendar03Icon,
  ComputerPhoneSyncIcon,
  Flag02Icon,
  InformationCircleIcon,
  PlaySquareIcon,
  Time03Icon,
  UserSquareIcon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import { use } from 'react';
import { RequireApp } from '@/components/require-app';
import { Button } from '@/components/ui/button';
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
    return (
      <>
        {seconds}
        <span className="text-muted-foreground">s</span>
      </>
    );
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? (
      <>
        {mins}
        <span className="text-muted-foreground">m</span> {secs}
        <span className="text-muted-foreground">s</span>
      </>
    ) : (
      <>
        {mins}
        <span className="text-muted-foreground">m</span>
      </>
    );
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? (
    <>
      {hours}
      <span className="text-muted-foreground">h</span> {mins}
      <span className="text-muted-foreground">m</span>
    </>
  ) : (
    <>
      {hours}
      <span className="text-muted-foreground">h</span>
    </>
  );
};

const formatDuration = (seconds: number | null) => {
  if (seconds === null || seconds === 0) {
    return (
      <>
        0<span className="text-muted-foreground">s</span>
      </>
    );
  }

  const totalSeconds = Math.floor(seconds);

  if (totalSeconds < 60) {
    return (
      <>
        {totalSeconds}
        <span className="text-muted-foreground">s</span>
      </>
    );
  }
  if (totalSeconds < 3600) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return secs > 0 ? (
      <>
        {mins}
        <span className="text-muted-foreground">m</span> {secs}
        <span className="text-muted-foreground">s</span>
      </>
    ) : (
      <>
        {mins}
        <span className="text-muted-foreground">m</span>
      </>
    );
  }
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  return mins > 0 ? (
    <>
      {hours}
      <span className="text-muted-foreground">h</span> {mins}
      <span className="text-muted-foreground">m</span>
    </>
  ) : (
    <>
      {hours}
      <span className="text-muted-foreground">h</span>
    </>
  );
};

const getColumns = (deviceId: string, appId: string): ColumnDef<Session>[] => [
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
  {
    id: 'actions',
    header: '',
    size: 50,
    cell: () => (
      <div className="flex h-full w-full items-center justify-center">
        <Link
          className="text-muted-foreground transition-colors hover:text-foreground"
          href={`/dashboard/analytics/users/${deviceId}?app=${appId}`}
        >
          <HugeiconsIcon className="size-4" icon={ViewIcon} />
        </Link>
      </div>
    ),
  },
];

type UserPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function UserPage({ params }: UserPageProps) {
  const { id } = use(params);
  const router = useRouter();
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

        <Button
          className="w-fit font-normal"
          onClick={() => router.back()}
          variant="outline"
        >
          <HugeiconsIcon icon={ArrowTurnBackwardIcon} />
          Back
        </Button>

        {deviceLoading && (
          <>
            <Card className="py-0">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-lg">User Information</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="size-4" />
                      <p className="text-muted-foreground text-sm">User ID</p>
                    </div>
                    <Skeleton className="mt-1 h-5 w-64" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="size-4" />
                      <p className="text-muted-foreground text-sm">
                        Identifier
                      </p>
                    </div>
                    <Skeleton className="mt-1 h-5 w-48" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon className="size-4" icon={Calendar03Icon} />
                      <p className="text-muted-foreground text-sm">
                        First Seen
                      </p>
                    </div>
                    <Skeleton className="mt-1 h-5 w-40" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon className="size-4" icon={Calendar03Icon} />
                      <p className="text-muted-foreground text-sm">
                        Last Activity
                      </p>
                    </div>
                    <Skeleton className="mt-1 h-5 w-40" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon className="size-4" icon={PlaySquareIcon} />
                      <p className="text-muted-foreground text-sm">
                        Total Sessions
                      </p>
                    </div>
                    <Skeleton className="mt-1 h-5 w-20" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon className="size-4" icon={Time03Icon} />
                      <p className="text-muted-foreground text-sm">
                        Avg Session Duration
                      </p>
                    </div>
                    <Skeleton className="mt-1 h-5 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="py-0">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-lg">Device Information</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon
                        className="size-4"
                        icon={ComputerPhoneSyncIcon}
                      />
                      <p className="text-muted-foreground text-sm">Platform</p>
                    </div>
                    <Skeleton className="mt-1 h-5 w-24" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon
                        className="size-4"
                        icon={InformationCircleIcon}
                      />
                      <p className="text-muted-foreground text-sm">
                        OS Version
                      </p>
                    </div>
                    <Skeleton className="mt-1 h-5 w-24" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon
                        className="size-4"
                        icon={ComputerPhoneSyncIcon}
                      />
                      <p className="text-muted-foreground text-sm">Model</p>
                    </div>
                    <Skeleton className="mt-1 h-5 w-24" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon
                        className="size-4"
                        icon={InformationCircleIcon}
                      />
                      <p className="text-muted-foreground text-sm">
                        App Version
                      </p>
                    </div>
                    <Skeleton className="mt-1 h-5 w-16" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon className="size-4" icon={Flag02Icon} />
                      <p className="text-muted-foreground text-sm">Country</p>
                    </div>
                    <Skeleton className="mt-1 h-5 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {!deviceLoading && device && (
          <>
            <Card className="py-0">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-lg">User Information</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <CopyButton
                        className="size-4 [&_svg]:size-4"
                        content={device.deviceId}
                        variant="ghost"
                      />
                      <p className="text-muted-foreground text-sm">User ID</p>
                    </div>
                    <p
                      className="mt-1 truncate font-mono font-semibold text-sm"
                      title={device.deviceId}
                    >
                      {device.deviceId}
                    </p>
                  </div>
                  {device.identifier && (
                    <div>
                      <div className="flex items-center gap-2">
                        <CopyButton
                          className="size-4 [&_svg]:size-4"
                          content={device.identifier}
                          variant="ghost"
                        />
                        <p className="text-muted-foreground text-sm">
                          Identifier
                        </p>
                      </div>
                      <p
                        className="mt-1 truncate font-mono font-semibold text-sm"
                        title={device.identifier}
                      >
                        {device.identifier}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon className="size-4" icon={Calendar03Icon} />
                      <p className="text-muted-foreground text-sm">
                        First Seen
                      </p>
                    </div>
                    <p className="mt-1 font-medium text-sm">
                      {formatDate(device.firstSeen)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon className="size-4" icon={Calendar03Icon} />
                      <p className="text-muted-foreground text-sm">
                        Last Activity
                      </p>
                    </div>
                    <p className="mt-1 font-medium text-sm">
                      {formatDate(device.lastActivityAt) ||
                        formatDate(device.firstSeen)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon className="size-4" icon={PlaySquareIcon} />
                      <p className="text-muted-foreground text-sm">
                        Total Sessions
                      </p>
                    </div>
                    <p className="mt-1 font-medium text-sm">
                      {device.totalSessions}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon className="size-4" icon={Time03Icon} />
                      <p className="text-muted-foreground text-sm">
                        Avg Session Duration
                      </p>
                    </div>
                    <p className="mt-1 font-medium text-sm">
                      {formatDuration(device.avgSessionDuration)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="py-0">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-lg">Device Information</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon
                        className="size-4"
                        icon={getPlatformIcon(device.platform)}
                      />
                      <p className="text-muted-foreground text-sm">Platform</p>
                    </div>
                    <p className="mt-1 font-medium text-sm">
                      {getPlatformLabel(device.platform)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon
                        className="size-4"
                        icon={InformationCircleIcon}
                      />
                      <p className="text-muted-foreground text-sm">
                        OS Version
                      </p>
                    </div>
                    <p className="mt-1 font-medium text-sm">
                      {device.osVersion || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon
                        className="size-4"
                        icon={ComputerPhoneSyncIcon}
                      />
                      <p className="text-muted-foreground text-sm">Model</p>
                    </div>
                    <p className="mt-1 font-medium text-sm">
                      {device.model || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon
                        className="size-4"
                        icon={InformationCircleIcon}
                      />
                      <p className="text-muted-foreground text-sm">
                        App Version
                      </p>
                    </div>
                    <p className="mt-1 font-medium text-sm">
                      {device.appVersion || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      {device.country ? (
                        <span className="text-base">
                          {String.fromCodePoint(
                            ...[...device.country.toUpperCase()].map(
                              (char) => 0x1_f1_e6 - 65 + char.charCodeAt(0)
                            )
                          )}
                        </span>
                      ) : (
                        <HugeiconsIcon className="size-4" icon={Flag02Icon} />
                      )}
                      <p className="text-muted-foreground text-sm">Country</p>
                    </div>
                    <p className="mt-1 font-medium text-sm">
                      {device.country
                        ? new Intl.DisplayNames(['en'], {
                            type: 'region',
                          }).of(device.country) || device.country
                        : 'Unknown'}
                    </p>
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

        <Card className="py-0">
          <CardContent className="space-y-4 p-4">
            <div>
              <h2 className="font-semibold text-lg">Sessions</h2>
              <p className="text-muted-foreground text-sm">
                All sessions for this user
              </p>
            </div>

            <DataTableServer
              columns={getColumns(id, appId || '')}
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
