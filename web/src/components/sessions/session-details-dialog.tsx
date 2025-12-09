'use client';

import {
  Calendar03Icon,
  CursorPointer02Icon,
  FolderSearchIcon,
  LinkSquare01Icon,
  PlayCircleIcon,
  StopCircleIcon,
  Time03Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import { useMemo } from 'react';
import { ClientDate, ClientDuration } from '@/components/client-date';
import { EventDetailsSheet } from '@/components/events/event-details-sheet';
import { CopyButton } from '@/components/ui/copy-button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { getGeneratedName, UserAvatar } from '@/components/user-profile';
import { buildQueryString, fetchApi } from '@/lib/api/client';
import type {
  EventListItem,
  EventsListResponse,
  Session,
} from '@/lib/api/types';
import { cacheConfig } from '@/lib/queries/query-client';
import { queryKeys } from '@/lib/queries/query-keys';
import { cn } from '@/lib/utils';

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
        'flex w-full items-center gap-3 rounded-md bg-muted/30 px-3 py-2 text-left transition-colors duration-100',
        'cursor-pointer hover:bg-accent hover:text-accent-foreground'
      )}
      exit={{ opacity: 0, scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      type="button"
    >
      <HugeiconsIcon className="size-4 shrink-0" icon={CursorPointer02Icon} />
      <span className="flex-1 truncate font-medium text-sm" title={event.name}>
        {event.name}
      </span>
      <ClientDate
        className="shrink-0 text-muted-foreground text-xs"
        date={event.timestamp}
        format="time"
      />
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
  const [, setEventId] = useQueryState('event', parseAsString);

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

  const generatedName = useMemo(() => {
    if (!session?.deviceId) {
      return '';
    }
    return getGeneratedName(session.deviceId);
  }, [session?.deviceId]);

  if (!(session && appId)) {
    return null;
  }

  const durationInSeconds = Math.floor(
    (new Date(session.lastActivityAt).getTime() -
      new Date(session.startedAt).getTime()) /
      1000
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[85vh] max-w-[95vw] flex-col p-0 sm:max-w-2xl lg:max-w-3xl">
        <DialogHeader className="border-b px-4 pt-4 pb-3 text-left sm:px-6 sm:pt-6 sm:pb-4">
          <DialogTitle>Session Details</DialogTitle>
          <div className="space-y-3 pt-3 sm:pt-4">
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs uppercase">User</p>
              <div className="flex items-center gap-3">
                <UserAvatar
                  seed={session.deviceId}
                  size={40}
                  variant="marble"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{generatedName}</p>
                    <button
                      className="size-4 shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-primary"
                      onClick={() => {
                        router.push(
                          `/dashboard/analytics/users/${session.deviceId}?app=${appId}`
                        );
                      }}
                      title="View user details"
                      type="button"
                    >
                      <HugeiconsIcon
                        className="size-4"
                        icon={LinkSquare01Icon}
                      />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <CopyButton
                      className="size-3 text-muted-foreground hover:text-primary [&_svg]:size-3"
                      content={session.deviceId}
                      variant="ghost"
                    />
                    <p className="truncate font-mono text-muted-foreground text-xs">
                      {session.deviceId}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 sm:gap-6">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs uppercase">Date</p>
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    className="size-4 text-muted-foreground"
                    icon={Calendar03Icon}
                  />
                  <ClientDate
                    className="text-primary text-sm"
                    date={session.startedAt}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs uppercase">
                  Duration
                </p>
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    className="size-4 text-muted-foreground"
                    icon={Time03Icon}
                  />
                  <ClientDuration
                    className="text-primary text-sm"
                    seconds={durationInSeconds}
                  />
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
          {isLoading && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3 rounded-md bg-muted/30 px-3 py-2">
                <Skeleton className="size-4 shrink-0 rounded-full" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-4 w-12 shrink-0" />
              </div>

              {['skeleton-event-1', 'skeleton-event-2', 'skeleton-event-3'].map(
                (key) => (
                  <div
                    className="flex items-center gap-3 rounded-md bg-muted/30 px-3 py-2"
                    key={key}
                  >
                    <Skeleton className="size-4 shrink-0 rounded-full" />
                    <Skeleton className="h-5 flex-1" />
                    <Skeleton className="h-4 w-12 shrink-0" />
                  </div>
                )
              )}

              <div className="flex items-center gap-3 rounded-md bg-muted/30 px-3 py-2">
                <Skeleton className="size-4 shrink-0 rounded-full" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-4 w-12 shrink-0" />
              </div>
            </div>
          )}

          {!isLoading && eventsData?.events && (
            <div className="flex flex-col gap-1">
              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 rounded-md bg-muted/30 px-3 py-2"
                initial={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                <HugeiconsIcon
                  className="size-4 shrink-0 text-destructive"
                  icon={StopCircleIcon}
                />
                <span className="flex-1 truncate font-medium text-sm">
                  Session Ended
                </span>
                <ClientDate
                  className="shrink-0 text-muted-foreground text-xs"
                  date={session.lastActivityAt}
                  format="time"
                />
              </motion.div>

              {eventsData.events.length > 0 && (
                <AnimatePresence mode="popLayout">
                  {eventsData.events.map((event) => (
                    <EventRow
                      event={event}
                      key={event.eventId}
                      onClick={() => {
                        setEventId(event.eventId);
                      }}
                    />
                  ))}
                </AnimatePresence>
              )}

              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 rounded-md bg-muted/30 px-3 py-2"
                initial={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                <HugeiconsIcon
                  className="size-4 shrink-0 text-success"
                  icon={PlayCircleIcon}
                />
                <span className="flex-1 truncate font-medium text-sm">
                  Session Started
                </span>
                <ClientDate
                  className="shrink-0 text-muted-foreground text-xs"
                  date={session.startedAt}
                  format="time"
                />
              </motion.div>
            </div>
          )}

          {!(isLoading || eventsData?.events) && (
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
      <EventDetailsSheet appId={appId} />
    </Dialog>
  );
}
