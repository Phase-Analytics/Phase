'use client';

import { Calendar03Icon, Time03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ColumnDef } from '@tanstack/react-table';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import { ClientDate, ClientDuration } from '@/components/client-date';
import { SessionDetailsDialog } from '@/components/sessions/session-details-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { DataTableServer } from '@/components/ui/data-table-server';
import type { Session } from '@/lib/api/types';
import { useSessions } from '@/lib/queries';
import { usePaginationStore } from '@/stores/pagination-store';

const columns: ColumnDef<Session>[] = [
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

type UserSessionsTableProps = {
  deviceId: string;
};

export function UserSessionsTable({ deviceId }: UserSessionsTableProps) {
  const [appId] = useQueryState('app', parseAsString);
  const [page] = useQueryState('page', parseAsInteger.withDefault(1));
  const [startDate] = useQueryState('startDate', parseAsString);
  const [endDate] = useQueryState('endDate', parseAsString);
  const [sessionId, setSessionId] = useQueryState('session', parseAsString);
  const { pageSize } = usePaginationStore();

  const { data: sessionsData, isLoading } = useSessions(appId || '', {
    page: page.toString(),
    pageSize: pageSize.toString(),
    deviceId,
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
      <Card className="py-0">
        <CardContent className="space-y-4 p-4">
          <div>
            <h2 className="font-semibold text-muted-foreground text-sm uppercase">
              Sessions & Events
            </h2>
            <p className="text-muted-foreground text-sm">
              User session history with events
            </p>
          </div>

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
          />
        </CardContent>
      </Card>
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
