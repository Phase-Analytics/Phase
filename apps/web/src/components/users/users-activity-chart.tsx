'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { useDeferredValue } from 'react';
import { TimescaleChart } from '@/components/timescale-chart';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ANALYTICS_TIME_RANGE_OPTIONS,
  toChartTimeRange,
} from '@/lib/analytics-time-range';
import { fillDailyTimeseriesGaps } from '@/lib/fill-daily-timeseries';
import { useDeviceTimeseries } from '@/lib/queries';
import { useTimezoneStore } from '@/stores/timezone-store';

export function UsersActivityChart() {
  const [appId] = useQueryState('app', parseAsString);
  const [timeRange, setTimeRange] = useQueryState(
    'range',
    parseAsString.withDefault('7d')
  );
  const [metric, setMetric] = useQueryState(
    'metric',
    parseAsString.withDefault('total')
  );

  const tz = useTimezoneStore((s) => s.timezone);
  // Deferred so a range/metric switch keeps the current chart mounted while
  // the next series loads instead of falling back to the Suspense skeleton.
  const deferredRange = useDeferredValue(timeRange);
  const deferredMetric = useDeferredValue(metric);
  const isStale = deferredRange !== timeRange || deferredMetric !== metric;

  const { data: timeseriesData } = useDeviceTimeseries(
    appId || '',
    toChartTimeRange(deferredRange || '7d'),
    deferredMetric === 'dau' ? 'dau' : 'total'
  );

  if (!appId) {
    return null;
  }

  const chartData = fillDailyTimeseriesGaps(
    timeseriesData.data.map((item) => ({
      date: item.date,
      value: item[deferredMetric === 'dau' ? 'activeUsers' : 'totalUsers'] || 0,
    })),
    timeseriesData.period,
    tz
  );

  return (
    <TimescaleChart
      chartColor="var(--color-chart-2)"
      data={chartData}
      dataKey="value"
      dataLabel={deferredMetric === 'dau' ? 'Active Users' : 'Total Users'}
      description={
        deferredMetric === 'dau'
          ? 'Daily active users over selected period'
          : 'Cumulative total users over selected period'
      }
      isPending={isStale}
      metric={metric}
      metricOptions={[
        { value: 'total', label: 'Total Users' },
        { value: 'dau', label: 'Daily Active Users' },
      ]}
      onMetricChange={setMetric}
      onTimeRangeChange={setTimeRange}
      timeRange={timeRange}
      timeRangeOptions={[...ANALYTICS_TIME_RANGE_OPTIONS]}
      title="User Activity"
    />
  );
}

export function UsersActivityChartSkeleton() {
  return (
    <Card className="py-0">
      <CardHeader className="space-y-0 border-b py-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-9 w-24" />
          </div>
          <Skeleton className="h-5 w-72" />
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 pb-4 sm:px-6 sm:pt-6">
        <Skeleton className="h-[250px] w-full" />
      </CardContent>
    </Card>
  );
}
