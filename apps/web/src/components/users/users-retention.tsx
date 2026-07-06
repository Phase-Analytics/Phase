'use client';

import type { RetentionPeriod, TimeRange } from '@phase/shared';
import { parseAsString, useQueryState } from 'nuqs';
import { MultiLineTimescaleChart } from '@/components/multi-line-timescale-chart';
import { TimescaleChart } from '@/components/timescale-chart';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeviceRetention } from '@/lib/queries';

const RETENTION_PERIODS: Array<{
  value: RetentionPeriod;
  label: string;
}> = [
  { value: 'd1', label: 'D1' },
  { value: 'd3', label: 'D3' },
  { value: 'd7', label: 'D7' },
  { value: 'd14', label: 'D14' },
  { value: 'd30', label: 'D30' },
];

const RETENTION_RANGE_OPTIONS = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '1 Month' },
  { value: '180d', label: '6 Months' },
  { value: '360d', label: '1 Year' },
];

const RETENTION_TREND_SERIES = [
  { dataKey: 'd1', label: 'D1', color: '#3b82f6' },
  { dataKey: 'd3', label: 'D3', color: '#06b6d4' },
  { dataKey: 'd7', label: 'D7', color: '#22c55e' },
  { dataKey: 'd14', label: 'D14', color: '#f59e0b' },
  { dataKey: 'd30', label: 'D30', color: '#ec4899' },
];

function getRetentionRange(value: string | null): TimeRange {
  if (
    value === '7d' ||
    value === '30d' ||
    value === '180d' ||
    value === '360d'
  ) {
    return value;
  }
  return '30d';
}

export function UsersRetentionCards() {
  const [appId] = useQueryState('app', parseAsString);
  const [timeRange] = useQueryState(
    'retentionRange',
    parseAsString.withDefault('30d')
  );
  const { data } = useDeviceRetention(
    appId || '',
    getRetentionRange(timeRange)
  );

  if (!appId) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {RETENTION_PERIODS.map(({ value, label }) => (
        <Card className="py-0" key={value}>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs uppercase">
              {label} Retention
            </p>
            <p className="font-bold text-3xl tabular-nums tracking-tight">
              {`${data.summary[value].toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}%`}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function UsersRetentionChart() {
  const [appId] = useQueryState('app', parseAsString);
  const [timeRange, setTimeRange] = useQueryState(
    'retentionRange',
    parseAsString.withDefault('30d')
  );
  const { data, isLoading } = useDeviceRetention(
    appId || '',
    getRetentionRange(timeRange)
  );

  if (!appId) {
    return null;
  }

  return (
    <div className="space-y-4">
      <TimescaleChart
        chartColor="#8b5cf6"
        data={data.data.map((point) => ({
          date: String(point.day),
          value: point.retentionRate,
        }))}
        dataKey="value"
        dataLabel="Active users"
        description="Exact-day retention after acquisition"
        isPending={isLoading}
        onTimeRangeChange={setTimeRange}
        timeRange={timeRange}
        timeRangeOptions={RETENTION_RANGE_OPTIONS}
        title="User Retention"
        tooltipLabelFormatter={(value) => `Day ${value}`}
        valueFormatter={(value) => `${value.toFixed(2)}%`}
        xTickFormatter={(value) => `Day ${value}`}
      />
      <MultiLineTimescaleChart
        data={data.cohortTrend.map(({ cohortSize: _, ...point }) => point)}
        description="Exact-day retention by acquisition week"
        isPending={isLoading}
        onTimeRangeChange={setTimeRange}
        series={RETENTION_TREND_SERIES}
        timeRange={timeRange}
        timeRangeOptions={RETENTION_RANGE_OPTIONS}
        title="Retention Trend"
      />
    </div>
  );
}

export function UsersRetentionCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {RETENTION_PERIODS.map(({ value }) => (
        <Card className="py-0" key={value}>
          <CardContent className="space-y-2 p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
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
