'use client';

import { ChartDownIcon, ChartUpIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { parseAsString, useQueryState } from 'nuqs';
import { Card, CardContent } from '@/components/ui/card';
import { CountingNumber } from '@/components/ui/counting-number';
import { useSessionOverview } from '@/lib/queries';
import { cn } from '@/lib/utils';

function getChangeColor(change: number) {
  if (change === 0) {
    return 'text-muted-foreground';
  }
  return change > 0 ? 'text-green-600' : 'text-red-600';
}

function formatDuration(seconds: number | null) {
  if (seconds === null || seconds === 0) {
    return (
      <>
        0<span className="text-muted-foreground">s</span>
      </>
    );
  }
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return (
    <>
      {minutes}
      <span className="text-muted-foreground">m</span> {secs}
      <span className="text-muted-foreground">s</span>
    </>
  );
}

export function SessionsOverviewCards() {
  const [appId] = useQueryState('app', parseAsString);
  const { data: overview } = useSessionOverview(appId || '');

  if (!appId) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">Total Sessions</p>
          <p className="font-bold text-3xl">
            <CountingNumber number={overview?.totalSessions || 0} />
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs">
            {(overview?.totalSessionsChange24h || 0) !== 0 && (
              <HugeiconsIcon
                className={cn(
                  'size-3',
                  getChangeColor(overview?.totalSessionsChange24h || 0)
                )}
                icon={
                  (overview?.totalSessionsChange24h || 0) > 0
                    ? ChartUpIcon
                    : ChartDownIcon
                }
              />
            )}
            <span
              className={cn(
                'font-medium',
                getChangeColor(overview?.totalSessionsChange24h || 0)
              )}
            >
              {Math.abs(overview?.totalSessionsChange24h || 0)}%
            </span>
            <span className="text-muted-foreground">from yesterday</span>
          </div>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">Daily Sessions</p>
          <p className="font-bold text-3xl">
            <CountingNumber number={overview?.activeSessions24h || 0} />
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs">
            {(overview?.activeSessions24hChange || 0) !== 0 && (
              <HugeiconsIcon
                className={cn(
                  'size-3',
                  getChangeColor(overview?.activeSessions24hChange || 0)
                )}
                icon={
                  (overview?.activeSessions24hChange || 0) > 0
                    ? ChartUpIcon
                    : ChartDownIcon
                }
              />
            )}
            <span
              className={cn(
                'font-medium',
                getChangeColor(overview?.activeSessions24hChange || 0)
              )}
            >
              {Math.abs(overview?.activeSessions24hChange || 0)}%
            </span>
            <span className="text-muted-foreground">from yesterday</span>
          </div>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">
            Average Session Duration
          </p>
          <p className="font-bold text-3xl">
            {formatDuration(overview?.averageSessionDuration || null)}
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">Avg time per session</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
