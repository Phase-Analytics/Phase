'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { TimescaleChart } from '@/components/timescale-chart';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { TimeRange } from '@/lib/api/types';
import { useSessionTimeseries } from '@/lib/queries';

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
    metric === 'daily_sessions' ? 'daily_sessions' : 'avg_duration'
  );

  if (!appId) {
    return null;
  }

  const chartData = (() => {
    if (!(timeseriesData?.data && timeseriesData.period)) {
      return [];
    }

    const valueKey =
      metric === 'daily_sessions' ? 'dailySessions' : 'avgDuration';
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
      dataLabel={metric === 'daily_sessions' ? 'Sessions' : 'Avg Duration'}
      description={
        metric === 'daily_sessions'
          ? 'Number of sessions started each day'
          : 'Average session duration in seconds per day'
      }
      isPending={isLoading}
      metric={metric}
      metricOptions={[
        { value: 'daily_sessions', label: 'Daily Sessions' },
        { value: 'avg_duration', label: 'Average Duration' },
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
      valueFormatter={
        metric === 'avg_duration'
          ? (value) => {
              const seconds = Math.floor(value);
              if (seconds === 0) {
                return '0s';
              }
              if (seconds < 60) {
                return `${seconds}s`;
              }
              if (seconds < 3600) {
                const mins = Math.floor(seconds / 60);
                const secs = seconds % 60;
                return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
              }
              const hours = Math.floor(seconds / 3600);
              const mins = Math.floor((seconds % 3600) / 60);
              return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
            }
          : undefined
      }
    />
  );
}

export function SessionsActivityChartSkeleton() {
  return (
    <Card className="py-0">
      <CardHeader className="space-y-0 border-b py-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value="daily_sessions">
              <TabsList>
                <TabsTrigger value="daily_sessions">Daily Sessions</TabsTrigger>
                <TabsTrigger value="avg_duration">Average Duration</TabsTrigger>
              </TabsList>
            </Tabs>
            <Skeleton className="h-9 w-24" />
          </div>
          <p className="text-muted-foreground text-sm">
            Number of sessions started each day
          </p>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 pb-4 sm:px-6 sm:pt-6">
        <Skeleton className="h-[250px] w-full" />
      </CardContent>
    </Card>
  );
}
