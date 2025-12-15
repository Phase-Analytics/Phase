'use client';

import {
  Calendar03Icon,
  CursorPointer02Icon,
  LinkSquare01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import { useMemo } from 'react';
import { ClientDate } from '@/components/client-date';
import { CopyButton } from '@/components/ui/copy-button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { getGeneratedName, UserAvatar } from '@/components/user-profile';
import { fetchApi } from '@/lib/api/client';
import type { Event } from '@/lib/api/types';
import { cacheConfig } from '@/lib/queries/query-client';
import { queryKeys } from '@/lib/queries/query-keys';

type EventsSheetProps = {
  appId: string;
};

function flattenObject(
  obj: unknown,
  prefix = '',
  separator = '.'
): Record<string, string | number | boolean | null> {
  if (obj === null || obj === undefined) {
    return {};
  }

  if (typeof obj !== 'object') {
    return prefix ? { [prefix]: obj as string | number | boolean } : {};
  }

  if (Array.isArray(obj)) {
    return { [prefix]: JSON.stringify(obj) };
  }

  const result: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}${separator}${key}` : key;

    if (value === null) {
      result[newKey] = null;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey, separator));
    } else if (Array.isArray(value)) {
      result[newKey] = JSON.stringify(value);
    } else {
      result[newKey] = value as string | number | boolean;
    }
  }

  return result;
}

export function EventsSheet({ appId }: EventsSheetProps) {
  const router = useRouter();
  const [eventId, setEventId] = useQueryState('event', parseAsString);
  const isOpen = Boolean(eventId);

  const { data: event, isLoading } = useQuery({
    queryKey: queryKeys.events.detail(eventId || '', appId),
    queryFn: () => {
      if (!(eventId && appId)) {
        throw new Error('Event ID and App ID are required');
      }
      return fetchApi<Event>(`/web/events/${eventId}?appId=${appId}`);
    },
    enabled: isOpen && Boolean(eventId && appId),
    ...cacheConfig.detail,
  });

  const generatedName = useMemo(() => {
    if (!event?.deviceId) {
      return '';
    }
    return getGeneratedName(event.deviceId);
  }, [event?.deviceId]);

  const flattenedParams = useMemo(() => {
    if (!event?.params) {
      return null;
    }
    const flattened = flattenObject(event.params);
    return Object.keys(flattened).length > 0 ? flattened : null;
  }, [event?.params]);

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) {
          setEventId(null);
        }
      }}
      open={isOpen}
    >
      <SheetContent className="flex w-full flex-col gap-6 overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="px-6">
          <SheetTitle>Event Details</SheetTitle>
        </SheetHeader>

        {isLoading && (
          <div className="space-y-6 px-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        )}

        {!isLoading && event && (
          <div className="space-y-6 px-6 pb-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs uppercase">
                  Event Name
                </p>
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    className="size-4 text-muted-foreground"
                    icon={CursorPointer02Icon}
                  />
                  <p className="font-medium text-sm">{event.name}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-muted-foreground text-xs uppercase">User</p>
                <div className="flex items-center gap-3">
                  <UserAvatar
                    seed={event.deviceId}
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
                            `/dashboard/analytics/users/${event.deviceId}?app=${appId}`
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
                        content={event.deviceId}
                        variant="ghost"
                      />
                      <p className="truncate font-mono text-muted-foreground text-xs">
                        {event.deviceId}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-muted-foreground text-xs uppercase">Date</p>
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    className="size-4 text-muted-foreground"
                    icon={Calendar03Icon}
                  />
                  <ClientDate className="text-sm" date={event.timestamp} />
                </div>
              </div>
            </div>

            {flattenedParams && (
              <div className="space-y-3">
                <p className="text-muted-foreground text-xs uppercase">
                  Parameters
                </p>
                <div className="rounded-md border">
                  <div className="divide-y">
                    {Object.entries(flattenedParams).map(([key, value]) => (
                      <div
                        className="flex items-start justify-between gap-4 px-4 py-3"
                        key={key}
                      >
                        <span className="font-medium text-muted-foreground text-sm">
                          {key}
                        </span>
                        <span className="break-all text-right font-mono text-sm">
                          {(() => {
                            if (value === null) {
                              return 'null';
                            }
                            if (typeof value === 'boolean') {
                              return value.toString();
                            }
                            return value;
                          })()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
