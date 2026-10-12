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
import { formatDuration } from '@/lib/date-utils';
import { fillDailyTimeseriesGaps } from '@/lib/fill-daily-timeseries';
import { useSessionTimeseries } from '@/lib/queries';
import { useTimezoneStore } from '@/stores/timezone-store';

function getMetricType(metric: string) {
  if (metric === 'daily_sessions') {
    return 'daily_sessions';
  }
  if (metric === 'avg_duration') {
    return 'avg_duration';
  }
  return 'bounce_rate';
}

function getValueKey(metric: string) {
  if (metric === 'daily_sessions') {
    return 'dailySessions';
  }
  if (metric === 'avg_duration') {
    return 'avgDuration';
  }
  return 'bounceRate';
}

function getDataLabel(metric: string) {
  if (metric === 'daily_sessions') {
    return 'Sessions';
  }
  if (metric === 'avg_duration') {
    return 'Avg Duration';
  }
  return 'Bounce Rate';
}

function getDescription(metric: string) {
  if (metric === 'daily_sessions') {
    return 'Number of sessions started each day';
  }
  if (metric === 'avg_duration') {
    return 'Average session duration in seconds per day';
  }
  return 'Percentage of sessions under 20 seconds per day';
}

function getValueFormatter(metric: string) {
  if (metric === 'avg_duration') {
    return (value: number) => formatDuration(value);
  }
  if (metric === 'bounce_rate') {
    return (value: number) => `${value.toFixed(2)}%`;
  }
}

export function SessionsActivityChart() {
  const [appId] = useQueryState('app', parseAsString);
  const [timeRange, setTimeRange] = useQueryState(
    'range',
    parseAsString.withDefault('7d')
  );
  const [metric, setMetric] = useQueryState(
    'metric',
    parseAsString.withDefault('daily_sessions')
  );

  const tz = useTimezoneStore((s) => s.timezone);
  // Deferred so a range/metric switch keeps the current chart mounted while
  // the next series loads instead of falling back to the Suspense skeleton.
  const deferredRange = useDeferredValue(timeRange);
  const deferredMetric = useDeferredValue(metric);
  const isStale = deferredRange !== timeRange || deferredMetric !== metric;

  const { data: timeseriesData } = useSessionTimeseries(
    appId || '',
    toChartTimeRange(deferredRange || '7d'),
    getMetricType(deferredMetric)
  );

  if (!appId) {
    return null;
  }

  const chartData = fillDailyTimeseriesGaps(
    timeseriesData.data.map((item) => ({
      date: item.date,
      value: item[getValueKey(deferredMetric)] || 0,
    })),
    timeseriesData.period,
    tz
  );

  return (
    <TimescaleChart
      chartColor="var(--color-chart-2)"
      data={chartData}
      dataKey="value"
      dataLabel={getDataLabel(deferredMetric)}
      description={getDescription(deferredMetric)}
      isPending={isStale}
      metric={metric}
      metricOptions={[
        { value: 'daily_sessions', label: 'Daily Sessions' },
        { value: 'avg_duration', label: 'Average Duration' },
        { value: 'bounce_rate', label: 'Bounce Rate' },
      ]}
      onMetricChange={setMetric}
      onTimeRangeChange={setTimeRange}
      timeRange={timeRange}
      timeRangeOptions={[...ANALYTICS_TIME_RANGE_OPTIONS]}
      title="Session Activity"
      valueFormatter={getValueFormatter(deferredMetric)}
    />
  );
}

export function SessionsActivityChartSkeleton() {
  return (
    <Card className="py-0">
      <CardHeader className="space-y-0 border-b py-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-8 w-80" />
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
