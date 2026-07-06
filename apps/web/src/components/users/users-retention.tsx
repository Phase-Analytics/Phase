'use client';

import type { DeviceRetentionResponse, RetentionPeriod } from '@phase/shared';
import { parseAsString, useQueryState } from 'nuqs';
import { useMemo } from 'react';
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

const RETENTION_COLORS = [
  '#3b82f6',
  '#06b6d4',
  '#22c55e',
  '#f59e0b',
  '#ec4899',
];

const RETENTION_SERIES = RETENTION_PERIODS.map((period, index) => ({
  dataKey: period.value,
  label: period.label,
  color: RETENTION_COLORS[index],
}));

const RETENTION_PERIOD_DAYS: Record<RetentionPeriod, number> = {
  d1: 1,
  d3: 3,
  d7: 7,
  d14: 14,
  d30: 30,
};

type CumulativeRetentionPoint = { date: string } & Record<
  RetentionPeriod,
  number
>;

function addUtcDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export function buildCumulativeRetentionData(
  cohorts: DeviceRetentionResponse['data']
) {
  const maturities = new Map<
    string,
    Array<{ period: RetentionPeriod; rate: number; cohortSize: number }>
  >();

  for (const cohort of cohorts) {
    for (const { value: period } of RETENTION_PERIODS) {
      const rate = cohort[period];
      if (rate === null) {
        continue;
      }

      const maturityDate = addUtcDays(
        cohort.date,
        RETENTION_PERIOD_DAYS[period]
      );
      const entries = maturities.get(maturityDate) ?? [];
      entries.push({ period, rate, cohortSize: cohort.cohortSize });
      maturities.set(maturityDate, entries);
    }
  }

  const maturityDates = [...maturities.keys()].sort();
  if (maturityDates.length === 0) {
    return [];
  }

  const totals = Object.fromEntries(
    RETENTION_PERIODS.map(({ value }) => [
      value,
      { weightedRates: 0, eligibleUsers: 0 },
    ])
  ) as Record<
    RetentionPeriod,
    { weightedRates: number; eligibleUsers: number }
  >;
  const result: CumulativeRetentionPoint[] = [];
  const currentDate = new Date(`${maturityDates[0]}T00:00:00Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  while (currentDate <= today) {
    const date = currentDate.toISOString().slice(0, 10);
    for (const maturity of maturities.get(date) ?? []) {
      const total = totals[maturity.period];
      total.weightedRates += maturity.rate * maturity.cohortSize;
      total.eligibleUsers += maturity.cohortSize;
    }

    result.push({
      date,
      ...Object.fromEntries(
        RETENTION_PERIODS.map(({ value }) => {
          const total = totals[value];
          return [
            value,
            total.eligibleUsers > 0
              ? Number((total.weightedRates / total.eligibleUsers).toFixed(2))
              : 0,
          ];
        })
      ),
    } as CumulativeRetentionPoint);
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return result;
}

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
            <p className="font-bold text-3xl tabular-nums tracking-[-0.04em]">
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
  const { data, isLoading } = useDeviceRetention(appId || '', '360d');
  const cumulativeData = useMemo(
    () => buildCumulativeRetentionData(data.data),
    [data.data]
  );

  if (!appId) {
    return null;
  }

  const selectedRange = toChartTimeRange(timeRange || '30d');
  const rangeDays = Number.parseInt(selectedRange, 10);
  const firstCohortDate = new Date();
  firstCohortDate.setUTCDate(firstCohortDate.getUTCDate() - rangeDays);
  const firstCohortDateString = firstCohortDate.toISOString().slice(0, 10);
  const chartData = cumulativeData.filter(
    (point) => point.date >= firstCohortDateString
  );

  return (
    <MultiLineTimescaleChart
      data={chartData}
      description="Cumulative rolling retention through each day"
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
