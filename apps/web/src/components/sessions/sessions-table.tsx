'use client';

import { Calendar03Icon, Time03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ColumnDef } from '@tanstack/react-table';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import { ClientDate, ClientDuration } from '@/components/client-date';
import { DataTableServer } from '@/components/ui/data-table-server';
import { getGeneratedName, UserAvatar } from '@/components/user-profile';
import type { Session } from '@/lib/api/types';
import { useSessions } from '@/lib/queries';
import { usePaginationStore } from '@/stores/pagination-store';
import { SessionDetailsDialog } from './session-details-dialog';

const columns: ColumnDef<Session>[] = [
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
    accessorKey: 'startedAt',
    header: 'Date',
    size: 200,
    cell: ({ row }) => {
      const timestamp = row.getValue('startedAt') as string;
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
  {
    accessorKey: 'lastActivityAt',
    header: 'Duration',
    size: 200,
    cell: ({ row }) => {
      const durationInSeconds = Math.floor(
        (new Date(row.original.lastActivityAt).getTime() -
          new Date(row.original.startedAt).getTime()) /
          1000
      );
      return (
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            className="text-muted-foreground"
            icon={Time03Icon}
            size={16}
          />
          <ClientDuration
            className="text-primary text-sm"
            seconds={durationInSeconds}
          />
        </div>
      );
    },
  },
];

export function SessionsTable() {
  const [appId] = useQueryState('app', parseAsString);
  const [page] = useQueryState('page', parseAsInteger.withDefault(1));
  const [search] = useQueryState('search', parseAsString.withDefault(''));
  const [startDate] = useQueryState('startDate', parseAsString);
  const [endDate] = useQueryState('endDate', parseAsString);
  const [sessionId, setSessionId] = useQueryState('session', parseAsString);
  const { pageSize } = usePaginationStore();

  const { data: sessionsData, isLoading } = useSessions(appId || '', {
    page: page.toString(),
    pageSize: pageSize.toString(),
    deviceId: search || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const selectedSession =
    sessionsData?.sessions.find((s) => s.sessionId === sessionId) || null;

  const handleViewSession = (session: Session) => {
    setSessionId(session.sessionId);
  };

  if (!appId) {
    return null;
  }

  return (
    <>
      <DataTableServer
        columns={columns}
        data={sessionsData?.sessions || []}
        isLoading={isLoading}
        onRowClick={handleViewSession}
        pagination={
          sessionsData?.pagination || {
            total: 0,
            page: 1,
            pageSize,
            totalPages: 0,
          }
        }
        searchKey="deviceId"
        searchPlaceholder="Search User"
      />
      <SessionDetailsDialog
        appId={appId}
        onOpenChange={(open) => {
          if (!open) {
            setTimeout(() => {
              setSessionId(null);
            }, 150);
          }
        }}
        open={Boolean(sessionId)}
        session={selectedSession}
      />
    </>
  );
}
