'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import { DataTableServer } from '@/components/ui/data-table-server';
import type { Session } from '@/lib/api/types';
import { formatDateTime } from '@/lib/date-utils';
import { useSessions } from '@/lib/queries';
import { usePaginationStore } from '@/stores/pagination-store';
import { SessionDetailsDialog } from './session-details-dialog';

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

const columns: ColumnDef<Session>[] = [
  {
    accessorKey: 'deviceId',
    header: 'User ID',
    size: 350,
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
    header: 'Date',
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
];

export function SessionsTable() {
  const [appId] = useQueryState('app', parseAsString);
  const [page] = useQueryState('page', parseAsInteger.withDefault(1));
  const [search] = useQueryState('search', parseAsString.withDefault(''));
  const [sessionId, setSessionId] = useQueryState('session', parseAsString);
  const { pageSize } = usePaginationStore();

  const { data: sessionsData } = useSessions(appId || '', {
    page: page.toString(),
    pageSize: pageSize.toString(),
    deviceId: search || undefined,
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
        isLoading={false}
        onRowClick={handleViewSession}
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
      <SessionDetailsDialog
        appId={appId}
        onOpenChange={(open) => {
          if (!open) {
            setSessionId(null);
          }
        }}
        open={Boolean(sessionId)}
        session={selectedSession}
      />
    </>
  );
}
