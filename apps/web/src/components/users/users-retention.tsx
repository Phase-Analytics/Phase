'use client';

import type { RetentionPeriod } from '@phase/shared';
import { parseAsString, useQueryState } from 'nuqs';
import { MultiLineTimescaleChart } from '@/components/multi-line-timescale-chart';
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

const RETENTION_SERIES = RETENTION_PERIODS.map((period, index) => ({
  dataKey: period.value,
  label: period.label,
  color: `var(--color-chart-${index + 1})`,
}));

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
    .map((cohort) => ({
      date: cohort.date,
      d1: cohort.d1 ?? 0,
      d3: cohort.d3 ?? 0,
      d7: cohort.d7 ?? 0,
      d14: cohort.d14 ?? 0,
      d30: cohort.d30 ?? 0,
    }));

  return (
    <MultiLineTimescaleChart
      data={chartData}
      description="Retention by signup cohort"
      isPending={isLoading}
      onTimeRangeChange={setTimeRange}
      series={RETENTION_SERIES}
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
