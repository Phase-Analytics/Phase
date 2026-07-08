'use client';

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Download01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ExploreResult, ExploreRunMeta } from '@phase/shared';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { downloadCsv } from '@/lib/utils/export-utils';

type ExploreResultsProps = {
  result: ExploreResult | null;
  meta: ExploreRunMeta | null;
  isPending: boolean;
  error: string | null;
  onPageChange: (page: number) => void;
};

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function ExploreTableResults({
  result,
  meta,
  onPageChange,
}: {
  result: ExploreResult & { kind: 'table' };
  meta: ExploreRunMeta | null;
  onPageChange: (page: number) => void;
}) {
  const tableData = useMemo(
    () =>
      result.rows.map((row) => {
        const record: Record<string, unknown> = {};
        for (let i = 0; i < result.columns.length; i++) {
          record[result.columns[i] ?? `col_${i}`] = row[i];
        }
        return record;
      }),
    [result.columns, result.rows]
  );

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () =>
      result.columns.map((column) => ({
        accessorKey: column,
        header: column,
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">
            {formatCellValue(getValue())}
          </span>
        ),
      })),
    [result.columns]
  );

  const handleExport = () => {
    downloadCsv(
      result.columns,
      result.rows,
      `explore-page-${meta?.page ?? 1}.csv`
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-muted-foreground text-sm">
          {meta ? (
            <>
              Page {meta.page}
              {meta.rowCount > 0
                ? ` · ${meta.rowCount} row${meta.rowCount === 1 ? '' : 's'}`
                : ' · No rows'}
              {meta.offset > 0
                ? ` · offset ${meta.offset.toLocaleString()}`
                : null}
              {meta.executionMs !== undefined
                ? ` · ${meta.executionMs}ms`
                : null}
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            disabled={!meta?.hasPreviousPage}
            onClick={() => meta && onPageChange(meta.page - 1)}
            size="sm"
            type="button"
            variant="outline"
          >
            <HugeiconsIcon className="size-4" icon={ArrowLeft01Icon} />
            Previous
          </Button>
          <Button
            disabled={!meta?.hasNextPage}
            onClick={() => meta && onPageChange(meta.page + 1)}
            size="sm"
            type="button"
            variant="outline"
          >
            Next
            <HugeiconsIcon className="size-4" icon={ArrowRight01Icon} />
          </Button>
          <Button
            disabled={result.rows.length === 0}
            onClick={handleExport}
            size="sm"
            type="button"
            variant="outline"
          >
            <HugeiconsIcon className="size-4" icon={Download01Icon} />
            Export page
          </Button>
        </div>
      </div>

      {result.rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No rows on this page.</p>
      ) : (
        <DataTable
          columns={columns}
          data={tableData}
          hideSearchClearButton
          pageSize={result.rows.length}
        />
      )}
    </div>
  );
}

export function ExploreResults({
  result,
  meta,
  isPending,
  error,
  onPageChange,
}: ExploreResultsProps) {
  if (isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[280px] w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive text-sm">{error}</div>;
  }

  if (!result || result.kind !== 'table') {
    return null;
  }

  return (
    <ExploreTableResults
      meta={meta}
      onPageChange={onPageChange}
      result={result}
    />
  );
}
