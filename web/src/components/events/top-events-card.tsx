'use client';

import { CursorPointer02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { parseAsString, useQueryState } from 'nuqs';
import { Card, CardContent } from '@/components/ui/card';
import { useTopEvents } from '@/lib/queries';

export function TopEventsCard() {
  const [appId] = useQueryState('app', parseAsString);
  const { data: topEvents } = useTopEvents(appId || '');

  if (!appId) {
    return null;
  }

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <div>
          <h2 className="font-semibold text-muted-foreground text-sm uppercase">
            Top Events
          </h2>
          <p className="text-muted-foreground text-sm">
            Most frequently triggered events
          </p>
        </div>

        {topEvents?.events && topEvents.events.length > 0 && (
          <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
            {(() => {
              const totalCount = topEvents.events
                .filter((e) => e?.count !== undefined)
                .reduce((sum, e) => sum + (e.count || 0), 0);

              return topEvents.events
                .filter((event) => event?.name && event?.count !== undefined)
                .map((event) => {
                  const percentage = totalCount
                    ? (event.count / totalCount) * 100
                    : 0;

                  return (
                    <div className="space-y-1.5" key={event.name}>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="truncate font-medium text-sm"
                          title={event.name}
                        >
                          {event.name}
                        </span>
                        <div className="flex shrink-0 items-baseline gap-2">
                          <span className="font-semibold text-sm">
                            {event.count.toLocaleString()}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                });
            })()}
          </div>
        )}

        {(!topEvents?.events || topEvents.events.length === 0) && (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <HugeiconsIcon
              className="size-10 text-muted-foreground opacity-40"
              icon={CursorPointer02Icon}
            />
            <p className="text-center font-medium text-muted-foreground text-sm">
              No event data available
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
