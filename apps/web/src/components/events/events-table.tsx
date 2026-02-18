'use client';

import {
  Calendar03Icon,
  CursorPointer02Icon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ColumnDef } from '@tanstack/react-table';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import { ClientDate } from '@/components/client-date';
import { DebugDataBadge } from '@/components/debug-data-badge';
import { EventsSheet } from '@/components/events/event-details-sheet';
import { DataTableServer } from '@/components/ui/data-table-server';
import { getGeneratedName, UserAvatar } from '@/components/user-profile';
import { useEvents } from '@/lib/queries';
import { usePaginationStore } from '@/stores/pagination-store';

type Event = {
  eventId: string;
  name: string;
  deviceId: string;
  isScreen: boolean;
  isDebug: boolean;
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
    header: 'Event',
    size: 350,
    cell: ({ row }) => {
      const isScreen = row.original.isScreen;
      const name = row.getValue('name') as string;
      const displayName = isScreen ? `View ${name}` : name;
      return (
        <div
          className="flex max-w-xs items-center gap-2 lg:max-w-sm"
          title={displayName}
        >
          <HugeiconsIcon
            className="shrink-0 text-muted-foreground"
            icon={isScreen ? ViewIcon : CursorPointer02Icon}
            size={16}
          />
          <span className="truncate font-medium text-primary text-sm">
            {displayName}
          </span>
          {row.original.isDebug && <DebugDataBadge className="shrink-0" />}
        </div>
      );
    },
  },
  {
    accessorKey: 'timestamp',
    header: 'Date',
    size: 200,
    cell: ({ row }) => {
      const timestamp = row.getValue('timestamp') as string;
      return (
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            className="text-muted-foreground"
            icon={Calendar03Icon}
            size={16}
          />
          <ClientDate className="text-primary text-sm" date={timestamp} />
        </div>
      );
    },
  },
];

export function EventsTable() {
  const [appId] = useQueryState('app', parseAsString);
  const [page] = useQueryState('page', parseAsInteger.withDefault(1));
  const [search] = useQueryState('search', parseAsString.withDefault(''));
  const [startDate] = useQueryState('startDate', parseAsString);
  const [endDate] = useQueryState('endDate', parseAsString);
  const [, setEventId] = useQueryState('event', parseAsString);
  const { pageSize } = usePaginationStore();

  const { data: eventsData, isLoading } = useEvents(appId || '', {
    page: page.toString(),
    pageSize: pageSize.toString(),
    eventName: search || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  if (!appId) {
    return null;
  }

  return (
    <>
      <DataTableServer
        columns={columns}
        data={eventsData?.events || []}
        isLoading={isLoading}
        onRowClick={(row) => {
          setEventId(row.eventId);
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
      <EventsSheet appId={appId || ''} />
    </>
  );
}
