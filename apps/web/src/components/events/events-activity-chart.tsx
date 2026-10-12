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
import { useEventTimeseries } from '@/lib/queries';
import { useTimezoneStore } from '@/stores/timezone-store';

export function EventsActivityChart() {
  const [appId] = useQueryState('app', parseAsString);
  const [timeRange, setTimeRange] = useQueryState(
    'range',
    parseAsString.withDefault('7d')
  );

  const tz = useTimezoneStore((s) => s.timezone);
  // Deferred so a range switch keeps the current chart mounted while the
  // next series loads instead of falling back to the Suspense skeleton.
  const deferredRange = useDeferredValue(timeRange);

  const { data: timeseriesData } = useEventTimeseries(
    appId || '',
    toChartTimeRange(deferredRange || '7d')
  );

  if (!appId) {
    return null;
  }

  const chartData = fillDailyTimeseriesGaps(
    timeseriesData.data.map((item) => ({
      date: item.date,
      value: item.dailyEvents || 0,
    })),
    timeseriesData.period,
    tz
  );

  return (
    <TimescaleChart
      chartColor="var(--color-chart-2)"
      data={chartData}
      dataKey="value"
      dataLabel="Daily Events"
      description="Daily event count over selected period"
      isPending={deferredRange !== timeRange}
      metric="daily"
      metricOptions={[{ value: 'daily', label: 'Daily Events' }]}
      onMetricChange={() => {
        // No-op
      }}
      onTimeRangeChange={setTimeRange}
      timeRange={timeRange}
      timeRangeOptions={[...ANALYTICS_TIME_RANGE_OPTIONS]}
      title="Event Activity"
    />
  );
}

export function EventsActivityChartSkeleton() {
  return (
    <Card className="py-0">
      <CardHeader className="space-y-0 border-b py-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
          <Skeleton className="h-5 w-64" />
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 pb-4 sm:px-6 sm:pt-6">
        <Skeleton className="h-[250px] w-full" />
      </CardContent>
    </Card>
  );
}
