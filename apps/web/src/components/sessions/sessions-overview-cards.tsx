'use client';

import { ChartDownIcon, ChartUpIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { parseAsString, useQueryState } from 'nuqs';
import { ClientDuration } from '@/components/client-date';
import { Card, CardContent } from '@/components/ui/card';
import { CountingNumber } from '@/components/ui/counting-number';
import { useSessionOverviewResponse } from '@/lib/queries';
import { cn } from '@/lib/utils';

function getChangeColor(change: number) {
  if (change === 0) {
    return 'text-muted-foreground';
  }
  return change > 0 ? 'text-success' : 'text-destructive';
}

export function SessionsOverviewCards() {
  const [appId] = useQueryState('app', parseAsString);
  const { data: overview } = useSessionOverviewResponse(appId || '');

  if (!appId) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-xs uppercase">
            Total Sessions
          </p>
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
          <p className="text-muted-foreground text-xs uppercase">
            Daily Sessions
          </p>
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
          <p className="text-muted-foreground text-xs uppercase">Bounce Rate</p>
          <p className="font-bold text-3xl">
            <CountingNumber number={overview?.bounceRate || 0} />%
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">Total bounce rate</span>
          </div>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-xs uppercase">
            Average Duration
          </p>
          <ClientDuration
            className="font-bold text-3xl"
            seconds={overview?.averageSessionDuration || null}
          />
          <div className="mt-1 flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">Avg time per session</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
