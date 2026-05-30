'use client';

import type { ExploreCoverage, ExploreResult } from '@phase/shared';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDuration } from '@/lib/date-utils';
import {
  fillDailyTimeseriesGaps,
  getChartPeriodDates,
} from '@/lib/fill-daily-timeseries';
import { ExploreBreakdownChart } from './explore-breakdown-chart';
import { ExploreCoverageStats } from './explore-coverage-stats';
import { ExploreTimeseriesChart } from './explore-timeseries-chart';

type ExploreResultsProps = {
  result: ExploreResult | null;
  coverage?: ExploreCoverage | null;
  isPending: boolean;
  error: string | null;
  formatTimeseriesAsDuration?: boolean;
  timeRange?: string;
};

export function ExploreResults({
  result,
  coverage,
  isPending,
  error,
  formatTimeseriesAsDuration = false,
  timeRange,
}: ExploreResultsProps) {
  if (isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[250px] w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive text-sm">{error}</div>;
  }

  if (!result) {
    return null;
  }

  return (
    <div className="space-y-5">
      {coverage ? <ExploreCoverageStats coverage={coverage} /> : null}
      <ResultBody
        formatTimeseriesAsDuration={formatTimeseriesAsDuration}
        result={result}
        timeRange={timeRange}
      />
    </div>
  );
}

function ResultBody({
  result,
  formatTimeseriesAsDuration,
  timeRange,
}: {
  result: ExploreResult;
  formatTimeseriesAsDuration: boolean;
  timeRange?: string;
}) {
  if (result.kind === 'scalar') {
    const display =
      result.label.toLowerCase().includes('duration') ||
      result.label.toLowerCase().includes('session')
        ? formatDuration(result.value)
        : result.value.toLocaleString();

    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">{result.label}</p>
        <p className="font-semibold text-4xl tabular-nums tracking-tight">
          {display}
        </p>
      </div>
    );
  }

  if (result.kind === 'percentiles') {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {result.rows.map((row) => (
            <div className="rounded-lg border bg-muted/15 p-3" key={row.label}>
              <p className="text-muted-foreground text-xs">{row.label}</p>
              <p className="font-medium text-xl tabular-nums">
                {row.label === 'Count'
                  ? row.value.toLocaleString()
                  : formatDuration(row.value)}
              </p>
            </div>
          ))}
        </div>
        <ExploreValueTable
          columnHeaders={['Metric', 'Value']}
          rows={result.rows.map((row) => ({
            id: row.label,
            primary: row.label,
            value:
              row.label === 'Count'
                ? row.value.toLocaleString()
                : formatDuration(row.value),
          }))}
        />
      </div>
    );
  }

  if (result.kind === 'breakdown') {
    return (
      <div className="space-y-4">
        <ExploreBreakdownChart rows={result.rows} />
        <ExploreValueTable
          columnHeaders={['Dimension', 'Value']}
          rows={result.rows.map((row) => ({
            id: row.dimension,
            primary: row.dimension,
            value: row.value.toLocaleString(),
          }))}
        />
      </div>
    );
  }

  if (result.kind === 'timeseries') {
    const filledPoints = timeRange
      ? fillDailyTimeseriesGaps(result.points, getChartPeriodDates(timeRange))
      : result.points;

    return (
      <div className="space-y-4">
        <ExploreTimeseriesChart
          formatAsDuration={formatTimeseriesAsDuration}
          points={filledPoints}
        />
        <ExploreValueTable
          columnHeaders={['Date', 'Value']}
          rows={filledPoints.map((point) => ({
            id: point.date,
            primary: point.date,
            value: formatTimeseriesAsDuration
              ? formatDuration(point.value)
              : point.value.toFixed(2),
          }))}
        />
      </div>
    );
  }

  if (result.kind === 'distribution') {
    return (
      <div className="space-y-4">
        <ExploreBreakdownChart
          rows={result.buckets.map((b) => ({
            dimension: b.bucket,
            value: b.count,
          }))}
        />
      </div>
    );
  }

  return null;
}

type ExploreValueTableRow = {
  id: string;
  primary: string;
  value: string;
};

function ExploreValueTable({
  columnHeaders,
  rows,
}: {
  columnHeaders: [string, string];
  rows: ExploreValueTableRow[];
}) {
  const columns = useMemo<ColumnDef<ExploreValueTableRow>[]>(
    () => [
      {
        accessorKey: 'primary',
        enableSorting: false,
        header: columnHeaders[0],
      },
      {
        accessorKey: 'value',
        enableSorting: false,
        header: columnHeaders[1],
        cell: ({ row }) => (
          <span className="tabular-nums">{row.getValue('value')}</span>
        ),
      },
    ],
    [columnHeaders]
  );

  return <DataTable columns={columns} data={rows} pageSize={10} />;
}
