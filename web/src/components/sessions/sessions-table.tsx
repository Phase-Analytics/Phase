'use client';

import { ViewIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import { DataTableServer } from '@/components/ui/data-table-server';
import type { Session } from '@/lib/api/types';
import { formatDateTime } from '@/lib/date-utils';
import { useSessions } from '@/lib/queries';
import { usePaginationStore } from '@/stores/pagination-store';

function formatDurationTable(startedAt: string, lastActivityAt: string) {
  const start = new Date(startedAt).getTime();
  const end = new Date(lastActivityAt).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return <span className="text-muted-foreground">—</span>;
  }

  const seconds = Math.floor((end - start) / 1000);

  if (seconds < 0) {
    return <span className="text-muted-foreground">—</span>;
  }

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
}

function getColumns(appId: string): ColumnDef<Session>[] {
  return [
    {
      accessorKey: 'deviceId',
      header: 'User ID',
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
      accessorKey: 'startedAt',
      header: 'Time',
      size: 200,
      cell: ({ row }) => {
        const timestamp = row.getValue('startedAt') as string;
        return (
          <span className="text-muted-foreground text-xs">
            {formatDateTime(timestamp)}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      size: 50,
      minSize: 50,
      cell: ({ row }) => (
        <div className="flex h-full w-full items-center justify-center">
          <Link
            className="text-muted-foreground transition-colors hover:text-foreground"
            href={`/dashboard/analytics/users/${row.original.deviceId}?app=${appId}`}
          >
            <HugeiconsIcon className="size-4" icon={ViewIcon} />
          </Link>
        </div>
      ),
    },
  ];
}

export function SessionsTable() {
  const [appId] = useQueryState('app', parseAsString);
  const [page] = useQueryState('page', parseAsInteger.withDefault(1));
  const [search] = useQueryState('search', parseAsString.withDefault(''));
  const { pageSize } = usePaginationStore();

  const { data: sessionsData } = useSessions(appId || '', {
    page: page.toString(),
    pageSize: pageSize.toString(),
    deviceId: search || undefined,
  });

  if (!appId) {
    return null;
  }

  return (
    <DataTableServer
      columns={getColumns(appId)}
      data={sessionsData?.sessions || []}
      isLoading={false}
      pagination={
        sessionsData?.pagination || {
          total: 0,
          page: 1,
          pageSize: 10,
          totalPages: 0,
        }
      }
      searchKey="deviceId"
      searchPlaceholder="Search User ID"
    />
  );
}
