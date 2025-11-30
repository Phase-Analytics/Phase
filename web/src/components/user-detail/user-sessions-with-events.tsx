'use client';

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  CursorPointer02Icon,
  Time03Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { DeviceSessionWithEvents } from '@/lib/api/types';
import { formatDateTime, formatTime } from '@/lib/date-utils';
import { useDeviceSessionsWithEvents } from '@/lib/queries';

function formatDuration(seconds: number | null) {
  if (seconds === null || seconds === 0) {
    return '0s';
  }

  const totalSeconds = Math.floor(seconds);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  if (totalSeconds < 3600) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

type SessionItemProps = {
  session: DeviceSessionWithEvents;
};

function SessionItem({ session }: SessionItemProps) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between border-border border-b pb-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <HugeiconsIcon className="size-4" icon={Calendar03Icon} />
            <span className="font-medium">
              {formatDateTime(session.startedAt)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <HugeiconsIcon className="size-4" icon={Time03Icon} />
            <span>{formatDuration(session.duration)}</span>
          </div>
        </div>
        <div className="text-muted-foreground text-sm">
          {session.events.length}{' '}
          {session.events.length === 1 ? 'event' : 'events'}
        </div>
      </div>

      {session.events.length > 0 && (
        <div className="space-y-1">
          {session.events.map((event) => (
            <div
              className="group flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-accent"
              key={event.eventId}
            >
              <div className="flex items-center gap-2.5">
                <HugeiconsIcon
                  className="size-4 text-muted-foreground"
                  icon={CursorPointer02Icon}
                />
                <span className="font-medium text-sm">{event.name}</span>
              </div>
              <span className="text-muted-foreground text-xs">
                {formatTime(event.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type UserSessionsWithEventsProps = {
  deviceId: string;
};

export function UserSessionsWithEvents({
  deviceId,
}: UserSessionsWithEventsProps) {
  const [appId] = useQueryState('app', parseAsString);
  const [page, setPage] = useQueryState(
    'sessions_page',
    parseAsInteger.withDefault(1)
  );

  const { data } = useDeviceSessionsWithEvents(deviceId, appId || '', {
    page: String(page),
    pageSize: '5',
  });

  if (!(appId && data)) {
    return null;
  }

  const { sessions, pagination } = data;
  const canPreviousPage = page > 1;
  const canNextPage = page < pagination.totalPages;

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Sessions & Events</h2>
          {pagination.total > 0 && (
            <span className="text-muted-foreground text-sm">
              {pagination.total} total sessions
            </span>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-border border-dashed">
            <p className="text-muted-foreground text-sm">No sessions found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <SessionItem key={session.sessionId} session={session} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-border border-t pt-4">
          <Button
            disabled={!canPreviousPage}
            onClick={() => setPage(page - 1)}
            size="sm"
            type="button"
            variant="outline"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} />
            Previous
          </Button>
          <div className="text-muted-foreground text-sm">
            {pagination.total > 0 ? (
              <>
                Page {page} of {pagination.totalPages}
              </>
            ) : (
              'No results'
            )}
          </div>
          <Button
            disabled={!canNextPage}
            onClick={() => setPage(page + 1)}
            size="sm"
            type="button"
            variant="outline"
          >
            Next
            <HugeiconsIcon icon={ArrowRight01Icon} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
