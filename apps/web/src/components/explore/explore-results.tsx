'use client';

import type { ExploreResult } from '@phase/shared';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDuration } from '@/lib/date-utils';
import { ExploreBreakdownChart } from './explore-breakdown-chart';
import { ExploreTimeseriesChart } from './explore-timeseries-chart';

type ExploreResultsProps = {
  result: ExploreResult | null;
  isPending: boolean;
  error: string | null;
};

export function ExploreResults({ result, isPending, error }: ExploreResultsProps) {
  if (isPending) {
    return (
      <div className="text-muted-foreground text-sm">Running query...</div>
    );
  }

  if (error) {
    return <div className="text-destructive text-sm">{error}</div>;
  }

  if (!result) {
    return (
      <div className="text-muted-foreground text-sm">
        Configure your query and click Run.
      </div>
    );
  }

  if (result.kind === 'scalar') {
    const display =
      result.label.toLowerCase().includes('duration') ||
      result.label.toLowerCase().includes('session')
        ? formatDuration(result.value)
        : result.value.toLocaleString();

    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">{result.label}</p>
        <p className="font-semibold text-4xl tabular-nums">{display}</p>
      </div>
    );
  }

  if (result.kind === 'percentiles') {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {result.rows.map((row) => (
            <div className="rounded-lg border p-3" key={row.label}>
              <p className="text-muted-foreground text-xs">{row.label}</p>
              <p className="font-medium text-xl tabular-nums">
                {row.label === 'Count'
                  ? row.value.toLocaleString()
                  : formatDuration(row.value)}
              </p>
            </div>
          ))}
        </div>
        <ResultTable
          headers={['Metric', 'Value']}
          rows={result.rows.map((row) => [
            row.label,
            row.label === 'Count'
              ? row.value.toLocaleString()
              : formatDuration(row.value),
          ])}
        />
      </div>
    );
  }

  if (result.kind === 'breakdown') {
    return (
      <div className="space-y-4">
        <ExploreBreakdownChart rows={result.rows} />
        <ResultTable
          headers={['Dimension', 'Value']}
          rows={result.rows.map((row) => [
            row.dimension,
            row.value.toLocaleString(),
          ])}
        />
      </div>
    );
  }

  if (result.kind === 'timeseries') {
    return (
      <div className="space-y-4">
        <ExploreTimeseriesChart points={result.points} />
        <ResultTable
          headers={['Date', 'Value']}
          rows={result.points.map((point) => [
            point.date,
            point.value.toFixed(2),
          ])}
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

function ResultTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {headers.map((header) => (
            <TableHead key={header}>{header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.join('-')}>
            {row.map((cell, index) => (
              <TableCell key={`${headers[index]}-${cell}`}>{cell}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
