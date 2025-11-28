'use client';

import { ChartDownIcon, ChartUpIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { parseAsString, useQueryState } from 'nuqs';
import { Card, CardContent } from '@/components/ui/card';
import { CountingNumber } from '@/components/ui/counting-number';
import { useDeviceLive, useDeviceOverview } from '@/lib/queries';
import { cn } from '@/lib/utils';

function getChangeColor(change: number) {
  if (change === 0) {
    return 'text-muted-foreground';
  }
  return change > 0 ? 'text-green-600' : 'text-red-600';
}

export function UsersOverviewCards() {
  const [appId] = useQueryState('app', parseAsString);
  const { data: overview } = useDeviceOverview(appId || '');
  const { data: liveData } = useDeviceLive(appId || '');

  if (!appId) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">Total Users</p>
          <p className="font-bold text-3xl">
            <CountingNumber number={overview?.totalDevices || 0} />
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs">
            {(overview?.totalDevicesChange24h || 0) !== 0 && (
              <HugeiconsIcon
                className={cn(
                  'size-3',
                  getChangeColor(overview?.totalDevicesChange24h || 0)
                )}
                icon={
                  (overview?.totalDevicesChange24h || 0) > 0
                    ? ChartUpIcon
                    : ChartDownIcon
                }
              />
            )}
            <span
              className={cn(
                'font-medium',
                getChangeColor(overview?.totalDevicesChange24h || 0)
              )}
            >
              {Math.abs(overview?.totalDevicesChange24h || 0)}%
            </span>
            <span className="text-muted-foreground">from yesterday</span>
          </div>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">Daily Active Users</p>
          <p className="font-bold text-3xl">
            <CountingNumber number={overview?.activeDevices24h || 0} />
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs">
            {(overview?.activeDevicesChange24h || 0) !== 0 && (
              <HugeiconsIcon
                className={cn(
                  'size-3',
                  getChangeColor(overview?.activeDevicesChange24h || 0)
                )}
                icon={
                  (overview?.activeDevicesChange24h || 0) > 0
                    ? ChartUpIcon
                    : ChartDownIcon
                }
              />
            )}
            <span
              className={cn(
                'font-medium',
                getChangeColor(overview?.activeDevicesChange24h || 0)
              )}
            >
              {Math.abs(overview?.activeDevicesChange24h || 0)}%
            </span>
            <span className="text-muted-foreground">from yesterday</span>
          </div>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-green-500" />
            </div>
            <p className="text-muted-foreground text-sm">Online Users</p>
          </div>
          <p className="font-bold text-3xl">
            <CountingNumber number={liveData?.activeNow || 0} />
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            Users currently online
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
