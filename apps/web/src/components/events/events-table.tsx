'use client';

import {
  AndroidIcon,
  AnonymousIcon,
  AppleIcon,
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
import type { EventListItem } from '@/lib/api/types';
import { useEvents } from '@/lib/queries';
import { usePaginationStore } from '@/stores/pagination-store';

function getPlatformIcon(platform: string | null | undefined) {
  switch (platform) {
    case 'android':
      return AndroidIcon;
    case 'ios':
      return AppleIcon;
    default:
      return AnonymousIcon;
  }
}

function getPlatformLabel(platform: string | null | undefined) {
  switch (platform) {
    case 'android':
      return 'Android';
    case 'ios':
      return 'iOS';
    default:
      return 'Unknown';
  }
}

const columns: ColumnDef<EventListItem>[] = [
  {
    accessorKey: 'deviceId',
    header: 'User',
    size: 280,
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
    accessorKey: 'platform',
    header: 'Platform',
    size: 120,
    cell: ({ row }) => {
      const platform = row.original.platform ?? null;
      return (
        <div className="flex items-center gap-1.5">
          <HugeiconsIcon
            className="size-3.5 text-muted-foreground"
            icon={getPlatformIcon(platform)}
          />
          <span className="text-sm">{getPlatformLabel(platform)}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'name',
    header: 'Event',
    size: 300,
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
    size: 180,
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
      <EventsSheet appId={appId} />
    </>
  );
}
