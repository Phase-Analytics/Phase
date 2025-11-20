'use client';

import { ArrowDown01Icon, ArrowUp01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useQueryState } from 'nuqs';
import { RequireApp } from '@/components/require-app';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useEventOverview, useTopEvents } from '@/lib/queries';
import { cn } from '@/lib/utils';

export default function EventsPage() {
  const [appId] = useQueryState('app');
  const { data: overview, isPending: overviewLoading } = useEventOverview(
    appId || ''
  );
  const { data: topEvents, isPending: topEventsLoading } = useTopEvents(
    appId || ''
  );

  const showLoading = overviewLoading || topEventsLoading;

  const getChangeColor = (change: number) => {
    if (change === 0) {
      return 'text-muted-foreground';
    }
    return change > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="font-bold text-2xl">Events</h1>
          <p className="text-muted-foreground text-sm">
            Track and analyze events in your application
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Total Events */}
          <Card className="py-0">
            <CardContent className="p-4">
              {showLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm">Total Events</p>
                  <p className="font-bold text-3xl">
                    {overview?.totalEvents.toLocaleString() || 0}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    {(overview?.totalEventsChange24h || 0) !== 0 && (
                      <HugeiconsIcon
                        className={cn(
                          'size-3',
                          getChangeColor(overview?.totalEventsChange24h || 0)
                        )}
                        icon={
                          (overview?.totalEventsChange24h || 0) > 0
                            ? ArrowUp01Icon
                            : ArrowDown01Icon
                        }
                      />
                    )}
                    <span
                      className={cn(
                        'font-medium',
                        getChangeColor(overview?.totalEventsChange24h || 0)
                      )}
                    >
                      {Math.abs(overview?.totalEventsChange24h || 0)}%
                    </span>
                    <span className="text-muted-foreground">
                      from yesterday
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Daily Events */}
          <Card className="py-0">
            <CardContent className="p-4">
              {showLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm">Daily Events</p>
                  <p className="font-bold text-3xl">
                    {overview?.events24h.toLocaleString() || 0}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    {(overview?.events24hChange || 0) !== 0 && (
                      <HugeiconsIcon
                        className={cn(
                          'size-3',
                          getChangeColor(overview?.events24hChange || 0)
                        )}
                        icon={
                          (overview?.events24hChange || 0) > 0
                            ? ArrowUp01Icon
                            : ArrowDown01Icon
                        }
                      />
                    )}
                    <span
                      className={cn(
                        'font-medium',
                        getChangeColor(overview?.events24hChange || 0)
                      )}
                    >
                      {Math.abs(overview?.events24hChange || 0)}%
                    </span>
                    <span className="text-muted-foreground">
                      from yesterday
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Events */}
        <Card className="py-0">
          <CardContent className="space-y-4 p-4">
            <div>
              <h2 className="font-semibold text-lg">Top Events</h2>
              <p className="text-muted-foreground text-sm">
                Most frequently triggered events
              </p>
            </div>

            {showLoading && (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            )}

            {!showLoading &&
              topEvents?.events &&
              topEvents.events.length > 0 && (
                <div className="space-y-2">
                  {topEvents.events.map((event, index) => (
                    <div
                      className="flex items-center justify-between rounded-lg border p-3"
                      key={event.name}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 font-semibold text-primary text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{event.name}</p>
                          <p className="text-muted-foreground text-xs">
                            Event name
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">
                          {event.count.toLocaleString()}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          triggers
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            {!showLoading &&
              (!topEvents?.events || topEvents.events.length === 0) && (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-muted-foreground">
                    No events recorded yet. Events will appear here once your
                    application starts tracking them.
                  </p>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </RequireApp>
  );
}
