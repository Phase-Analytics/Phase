'use client';

import {
  Activity02Icon,
  Calendar03Icon,
  FolderSearchIcon,
  PresentationLineChart02Icon,
  Time03Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { CopyButton } from '@/components/ui/copy-button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { buildQueryString, fetchApi } from '@/lib/api/client';
import type {
  EventListItem,
  EventsListResponse,
  Session,
} from '@/lib/api/types';
import { formatDateTime, formatTime } from '@/lib/date-utils';
import { cacheConfig } from '@/lib/queries/query-client';
import { queryKeys } from '@/lib/queries/query-keys';
import { cn } from '@/lib/utils';

function formatDuration(startedAt: string, lastActivityAt: string) {
  const start = new Date(startedAt).getTime();
  const end = new Date(lastActivityAt).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return '—';
  }

  const seconds = Math.floor((end - start) / 1000);

  if (seconds < 0) {
    return '—';
  }

  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function EventRow({
  event,
  onClick,
}: {
  event: EventListItem;
  onClick: () => void;
}) {
  return (
    <motion.button
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex w-full items-center gap-3 rounded-md bg-muted/30 px-3 py-3 text-left transition-colors duration-100',
        'cursor-pointer hover:bg-accent hover:text-accent-foreground'
      )}
      exit={{ opacity: 0, scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      type="button"
    >
      <HugeiconsIcon className="size-4 shrink-0" icon={Activity02Icon} />
      <span className="flex-1 truncate font-medium text-sm" title={event.name}>
        {event.name}
      </span>
      <span className="shrink-0 text-muted-foreground text-xs">
        {formatTime(event.timestamp)}
      </span>
    </motion.button>
  );
}

type SessionDetailsDialogProps = {
  session: Session | null;
  appId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SessionDetailsDialog({
  session,
  appId,
  open,
  onOpenChange,
}: SessionDetailsDialogProps) {
  const router = useRouter();

  const { data: eventsData, isLoading } = useQuery({
    queryKey: queryKeys.events.list(appId, { sessionId: session?.sessionId }),
    queryFn: () => {
      if (!(session?.sessionId && appId)) {
        return Promise.resolve({
          events: [],
          pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
        });
      }
      return fetchApi<EventsListResponse>(
        `/web/events${buildQueryString({ sessionId: session.sessionId, appId })}`
      );
    },
    enabled: open && Boolean(session?.sessionId && appId),
    ...cacheConfig.list,
  });

  if (!(session && appId)) {
    return null;
  }

  const duration = formatDuration(session.startedAt, session.lastActivityAt);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col p-0">
        <DialogHeader className="border-b px-6 pt-6 pb-4">
          <DialogTitle>Session Details</DialogTitle>
          <div className="space-y-3 pt-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CopyButton
                  className="size-4 [&_svg]:size-4"
                  content={session.deviceId}
                  variant="ghost"
                />
                <p className="text-muted-foreground text-xs">User ID</p>
              </div>
              <p className="break-all font-mono text-sm">{session.deviceId}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon className="size-4" icon={Calendar03Icon} />
                  <p className="text-muted-foreground text-xs">Started At</p>
                </div>
                <p className="text-sm">{formatDateTime(session.startedAt)}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon className="size-4" icon={Time03Icon} />
                  <p className="text-muted-foreground text-xs">Duration</p>
                </div>
                <p className="text-sm">{duration}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    className="size-4"
                    icon={PresentationLineChart02Icon}
                  />
                  <p className="text-muted-foreground text-xs">Events</p>
                </div>
                <p className="text-sm">{eventsData?.events.length || 0}</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {isLoading && (
            <div className="flex flex-col gap-1">
              {Array.from({ length: 5 }).map((__, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Loading skeleton rows are static and don't reorder
                <div className="rounded-md px-3 py-3" key={`loading-${index}`}>
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && eventsData?.events && eventsData.events.length > 0 && (
            <div className="flex flex-col gap-1">
              <AnimatePresence mode="popLayout">
                {eventsData.events.map((event) => (
                  <EventRow
                    event={event}
                    key={event.eventId}
                    onClick={() => {
                      router.push(
                        `/dashboard/analytics/events/${event.eventId}?app=${appId}`
                      );
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {!isLoading &&
            (!eventsData?.events || eventsData.events.length === 0) && (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-2">
                <HugeiconsIcon
                  className="size-10 text-muted-foreground opacity-40"
                  icon={FolderSearchIcon}
                />
                <div className="flex flex-col gap-1 text-center">
                  <p className="font-medium text-muted-foreground text-sm">
                    No events found
                  </p>
                  <p className="text-muted-foreground text-xs">
                    This session has no recorded events
                  </p>
                </div>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
