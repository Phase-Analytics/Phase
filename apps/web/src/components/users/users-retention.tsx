'use client';

import type { RetentionPeriod } from '@phase/shared';
import { parseAsString, useQueryState } from 'nuqs';
import { TimescaleChart } from '@/components/timescale-chart';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ANALYTICS_TIME_RANGE_OPTIONS,
  toChartTimeRange,
} from '@/lib/analytics-time-range';
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

const RETENTION_CHART_PERIODS = RETENTION_PERIODS.filter(
  (period) => period.value !== 'd30'
);

export function UsersRetentionCards() {
  const [appId] = useQueryState('app', parseAsString);
  const { data } = useDeviceRetention(appId || '', '360d');

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
            <p className="font-bold text-3xl">
              {data.summary[value].toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
              %
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              Exact-day return rate
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
  const [metric, setMetric] = useQueryState(
    'retentionMetric',
    parseAsString.withDefault('d1')
  );
  const retentionMetric = RETENTION_CHART_PERIODS.some(
    (period) => period.value === metric
  )
    ? (metric as RetentionPeriod)
    : 'd1';
  const { data, isLoading } = useDeviceRetention(appId || '', '360d');

  if (!appId) {
    return null;
  }

  const selectedRange = toChartTimeRange(timeRange || '30d');
  const rangeDays = Number.parseInt(selectedRange, 10);
  const firstCohortDate = new Date();
  firstCohortDate.setUTCDate(firstCohortDate.getUTCDate() - rangeDays);
  const firstCohortDateString = firstCohortDate.toISOString().slice(0, 10);
  const chartData = data.data
    .filter((cohort) => cohort.date >= firstCohortDateString)
    .filter((cohort) => cohort[retentionMetric] !== null)
    .map((cohort) => ({
      date: cohort.date,
      value: cohort[retentionMetric] ?? 0,
    }));

  return (
    <TimescaleChart
      chartColor="var(--color-chart-3)"
      data={chartData}
      dataKey="value"
      dataLabel={`${retentionMetric.toUpperCase()} Retention`}
      description="Exact-day return rate by signup cohort"
      isPending={isLoading}
      metric={retentionMetric}
      metricOptions={RETENTION_CHART_PERIODS.map((period) => ({
        value: period.value,
        label: period.label,
      }))}
      onMetricChange={setMetric}
      onTimeRangeChange={setTimeRange}
      timeRange={timeRange}
      timeRangeOptions={[...ANALYTICS_TIME_RANGE_OPTIONS]}
      title="User Retention"
    />
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
            <Skeleton className="h-4 w-28" />
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
