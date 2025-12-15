'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { TimescaleChart } from '@/components/timescale-chart';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { TimeRange } from '@/lib/api/types';
import { formatDuration } from '@/lib/date-utils';
import { useSessionTimeseries } from '@/lib/queries';

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
  return 'Percentage of sessions under 10 seconds per day';
}

function getValueFormatter(metric: string) {
  if (metric === 'avg_duration') {
    return (value: number) => formatDuration(value);
  }
  if (metric === 'bounce_rate') {
    return (value: number) => `${value.toFixed(2)}%`;
  }
  return;
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

  const { data: timeseriesData, isLoading } = useSessionTimeseries(
    appId || '',
    (timeRange || '7d') as TimeRange,
    getMetricType(metric)
  );

  if (!appId) {
    return null;
  }

  const chartData = (() => {
    if (!(timeseriesData?.data && timeseriesData.period)) {
      return [];
    }

    const valueKey = getValueKey(metric);
    const dataMap = new Map(
      timeseriesData.data.map((item) => [item.date, item[valueKey] || 0])
    );

    const startDate = new Date(timeseriesData.period.startDate);
    const endDate = new Date(timeseriesData.period.endDate);
    const allDates: Array<{ date: string; value: number }> = [];

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      allDates.push({
        date: dateStr,
        value: dataMap.get(dateStr) || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return allDates;
  })();

  return (
    <TimescaleChart
      chartColor="var(--color-chart-2)"
      data={chartData}
      dataKey="value"
      dataLabel={getDataLabel(metric)}
      description={getDescription(metric)}
      isPending={isLoading}
      metric={metric}
      metricOptions={[
        { value: 'daily_sessions', label: 'Daily Sessions' },
        { value: 'avg_duration', label: 'Average Duration' },
        { value: 'bounce_rate', label: 'Bounce Rate' },
      ]}
      onMetricChange={setMetric}
      onTimeRangeChange={setTimeRange}
      timeRange={timeRange}
      timeRangeOptions={[
        { value: '7d', label: '7 Days' },
        { value: '30d', label: '1 Month' },
        { value: '180d', label: '6 Months' },
        { value: '360d', label: '1 Year' },
      ]}
      title="Session Activity"
      valueFormatter={getValueFormatter(metric)}
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
