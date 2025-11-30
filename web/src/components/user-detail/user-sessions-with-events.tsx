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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    <AccordionItem
      className="rounded-lg border-0 bg-card"
      value={session.sessionId}
    >
      <div className="rounded-lg border border-border px-4">
        <AccordionTrigger className="py-3 hover:no-underline">
          <div className="flex w-full items-center justify-between pr-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <HugeiconsIcon className="size-4" icon={Calendar03Icon} />
                <span className="font-mono text-xs">
                  {formatDateTime(session.startedAt)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <HugeiconsIcon
                  className="size-4 text-muted-foreground"
                  icon={Time03Icon}
                />
                <span className="font-mono text-muted-foreground text-xs">
                  {formatDuration(session.duration)}
                </span>
              </div>
            </div>
            <div className="hidden font-mono text-muted-foreground text-xs md:block">
              {session.events.length}{' '}
              {session.events.length === 1 ? 'event' : 'events'}
            </div>
          </div>
        </AccordionTrigger>

        <AccordionContent className="pb-3">
          {session.events.length > 0 ? (
            <div className="space-y-1">
              {session.events.map((event) => (
                <div
                  className="flex items-center gap-3 rounded-md bg-muted/30 px-3 py-3 transition-colors hover:bg-accent hover:text-accent-foreground"
                  key={event.eventId}
                >
                  <HugeiconsIcon
                    className="size-4 shrink-0"
                    icon={CursorPointer02Icon}
                  />
                  <span
                    className="flex-1 truncate font-medium text-sm"
                    title={event.name}
                  >
                    {event.name}
                  </span>
                  <span className="shrink-0 font-mono text-muted-foreground text-xs">
                    {formatTime(event.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No events in this session
            </p>
          )}
        </AccordionContent>
      </div>
    </AccordionItem>
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
      <CardContent className="flex flex-col p-4">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-semibold text-lg">Sessions & Events</h2>
        </div>

        <ScrollArea className="h-[280px]">
          {sessions.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-lg border border-border border-dashed">
              <p className="text-muted-foreground text-sm">No sessions found</p>
            </div>
          ) : (
            <Accordion className="space-y-3 pr-4" collapsible type="single">
              {sessions.map((session) => (
                <SessionItem key={session.sessionId} session={session} />
              ))}
            </Accordion>
          )}
        </ScrollArea>

        <div className="mt-4 flex items-center justify-between border-border border-t pt-4">
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
                Page <span className="font-mono">{page}</span> of{' '}
                <span className="font-mono">{pagination.totalPages}</span>
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
