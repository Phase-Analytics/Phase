'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import { DataTableServer } from '@/components/ui/data-table-server';
import { getGeneratedName, UserAvatar } from '@/components/user-profile';
import { formatDateTime } from '@/lib/date-utils';
import { useEvents } from '@/lib/queries';
import { usePaginationStore } from '@/stores/pagination-store';

type Event = {
  eventId: string;
  name: string;
  deviceId: string;
  timestamp: string;
};

const columns: ColumnDef<Event>[] = [
  {
    accessorKey: 'deviceId',
    header: 'User',
    size: 350,
    cell: ({ row }) => {
      const deviceId = row.getValue('deviceId') as string;
      const generatedName = getGeneratedName(deviceId);
      return (
        <div
          className="flex max-w-xs items-center gap-2 lg:max-w-sm"
          title={deviceId}
        >
          <UserAvatar seed={deviceId} size={20} />
          <span className="truncate text-sm">{generatedName}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'name',
    header: 'Event Name',
    size: 350,
    cell: ({ row }) => (
      <div
        className="max-w-xs truncate font-medium text-sm lg:max-w-sm"
        title={row.getValue('name')}
      >
        {row.getValue('name')}
      </div>
    ),
  },
  {
    accessorKey: 'timestamp',
    header: 'Date',
    size: 200,
    cell: ({ row }) => {
      const timestamp = row.getValue('timestamp') as string;
      return (
        <span className="font-mono text-muted-foreground text-xs">
          {formatDateTime(timestamp)}
        </span>
      );
    },
  },
];

export function EventsTable() {
  const router = useRouter();
  const [appId] = useQueryState('app', parseAsString);
  const [page] = useQueryState('page', parseAsInteger.withDefault(1));
  const [search] = useQueryState('search', parseAsString.withDefault(''));
  const { pageSize } = usePaginationStore();

  const { data: eventsData, isLoading } = useEvents(appId || '', {
    page: page.toString(),
    pageSize: pageSize.toString(),
    eventName: search || undefined,
  });

  if (!appId) {
    return null;
  }

  return (
    <DataTableServer
      columns={columns}
      data={eventsData?.events || []}
      isLoading={isLoading}
      onRowClick={(row) => {
        router.push(`/dashboard/analytics/events/${row.eventId}?app=${appId}`);
      }}
      pagination={
        eventsData?.pagination || {
          total: 0,
          page: 1,
          pageSize,
          totalPages: 0,
        }
      }
      searchKey="name"
      searchPlaceholder="Search events"
    />
  );
}
