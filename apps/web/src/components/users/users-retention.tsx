'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { TimescaleChart } from '@/components/timescale-chart';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeviceRetention } from '@/lib/queries';

export function UsersRetentionChart() {
  const [appId] = useQueryState('app', parseAsString);
  const { data, isLoading } = useDeviceRetention(appId || '', '30d');

  if (!appId) {
    return null;
  }

  return (
    <TimescaleChart
      chartColor="var(--color-chart-2)"
      data={(data?.data ?? []).map((point) => ({
        date: String(point.day),
        value: point.retentionRate,
        label: `Day ${point.day}`,
      }))}
      dataKey="value"
      dataLabel="Retention"
      description="Exact-day retention after acquisition"
      isPending={isLoading}
      showTimeRange={false}
      title="User Retention"
      tooltipLabelFormatter={(value) => `Day ${value}`}
      valueFormatter={(value) => `${value.toFixed(2)}%`}
    />
  );
}

export function UsersRetentionChartSkeleton() {
  return (
    <Card className="py-0">
      <CardHeader className="space-y-3 border-b py-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-72" />
      </CardHeader>
      <CardContent className="px-2 pt-4 pb-4 sm:px-6 sm:pt-6">
        <Skeleton className="h-[250px] w-full" />
      </CardContent>
    </Card>
  );
}
