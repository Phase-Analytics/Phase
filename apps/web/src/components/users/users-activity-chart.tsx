'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { TimescaleChart } from '@/components/timescale-chart';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { TimeRange } from '@/lib/api/types';
import { useDeviceTimeseries } from '@/lib/queries';

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

  const { data: timeseriesData, isLoading } = useDeviceTimeseries(
    appId || '',
    (timeRange || '7d') as TimeRange,
    metric === 'dau' ? 'dau' : 'total'
  );

  if (!appId) {
    return null;
  }

  const chartData = (() => {
    if (!(timeseriesData?.data && timeseriesData.period)) {
      return [];
    }

    const valueKey = metric === 'dau' ? 'activeUsers' : 'totalUsers';
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
      dataLabel={metric === 'dau' ? 'Active Users' : 'Total Users'}
      description={
        metric === 'dau'
          ? 'Daily active users over selected period'
          : 'Cumulative total users over selected period'
      }
      isPending={isLoading}
      metric={metric}
      metricOptions={[
        { value: 'total', label: 'Total Users' },
        { value: 'dau', label: 'Daily Active Users' },
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
