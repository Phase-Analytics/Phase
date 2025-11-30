'use client';

import { ChartDownIcon, ChartUpIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { parseAsString, useQueryState } from 'nuqs';
import { Card, CardContent } from '@/components/ui/card';
import { CountingNumber } from '@/components/ui/counting-number';
import { useEventOverview } from '@/lib/queries';
import { cn } from '@/lib/utils';

function getChangeColor(change: number) {
  if (change === 0) {
    return 'text-muted-foreground';
  }
  return change > 0 ? 'text-green-600' : 'text-red-600';
}

export function EventsOverviewCards() {
  const [appId] = useQueryState('app', parseAsString);
  const { data: overview } = useEventOverview(appId || '');

  if (!appId) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">Total Events</p>
          <p className="font-bold font-mono text-3xl">
            <CountingNumber number={overview?.totalEvents || 0} />
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
                    ? ChartUpIcon
                    : ChartDownIcon
                }
              />
            )}
            <span
              className={cn(
                'font-medium font-mono',
                getChangeColor(overview?.totalEventsChange24h || 0)
              )}
            >
              {Math.abs(overview?.totalEventsChange24h || 0)}%
            </span>
            <span className="text-muted-foreground">from yesterday</span>
          </div>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">Daily Events</p>
          <p className="font-bold font-mono text-3xl">
            <CountingNumber number={overview?.events24h || 0} />
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
                    ? ChartUpIcon
                    : ChartDownIcon
                }
              />
            )}
            <span
              className={cn(
                'font-medium font-mono',
                getChangeColor(overview?.events24hChange || 0)
              )}
            >
              {Math.abs(overview?.events24hChange || 0)}%
            </span>
            <span className="text-muted-foreground">from yesterday</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
