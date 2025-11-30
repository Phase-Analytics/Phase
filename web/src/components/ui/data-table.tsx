'use client';

import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  FolderSearchIcon,
  Search01Icon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  onRowClick?: (row: TData) => void;
};

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  pageSize = 10,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="w-full space-y-4">
      {searchKey && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="w-48 flex-shrink-0 sm:w-56"
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            placeholder={searchPlaceholder}
            type="text"
            value={
              (table.getColumn(searchKey)?.getFilterValue() as string) ?? ''
            }
          />
          <Button
            className="flex-shrink-0"
            disabled={
              !table.getColumn(searchKey)?.getFilterValue() ||
              (table.getColumn(searchKey)?.getFilterValue() as string) === ''
            }
            onClick={() => table.getColumn(searchKey)?.setFilterValue('')}
            size="sm"
            type="button"
            variant="secondary"
          >
            <HugeiconsIcon icon={Search01Icon} />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    className="bg-muted/50 font-semibold"
                    key={header.id}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
                {onRowClick && (
                  <TableHead className="bg-muted/50 font-semibold w-12" />
                )}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const cells = row.getVisibleCells();
                return (
                  <TableRow
                    className={onRowClick ? 'cursor-pointer' : ''}
                    key={row.id}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {cells.map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                    {onRowClick && (
                      <TableCell className="w-12 text-center">
                        <HugeiconsIcon
                          className="size-4 text-muted-foreground"
                          icon={ViewIcon}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  className="h-32 text-center"
                  colSpan={columns.length}
                >
                  <div className="flex flex-col items-center justify-center gap-2 py-4">
                    <HugeiconsIcon
                      className="size-10 text-muted-foreground opacity-40"
                      icon={FolderSearchIcon}
                    />
                    <div className="flex flex-col gap-1">
                      <p className="font-medium text-muted-foreground text-sm">
                        No data available
                      </p>
                      <p className="text-muted-foreground text-xs">
                        There are no records to display
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-muted-foreground text-sm">
          {table.getFilteredRowModel().rows.length > 0 ? (
            <>
              <span className="hidden sm:inline">
                Page {table.getState().pagination.pageIndex + 1} of{' '}
                {table.getPageCount()} (
                {table.getFilteredRowModel().rows.length} total)
              </span>
              <span className="sm:hidden">
                {table.getState().pagination.pageIndex + 1}/
                {table.getPageCount()}
              </span>
            </>
          ) : (
            'No results'
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            size="sm"
            type="button"
            variant="outline"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} />
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>
          <Button
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            size="sm"
            type="button"
            variant="outline"
          >
            <span className="hidden sm:inline">Next</span>
            <HugeiconsIcon icon={ArrowRight01Icon} />
          </Button>
        </div>
      </div>
    </div>
  );
}

type DataTableColumnHeaderProps<TData> = {
  column: Column<TData>;
  title: string;
};

export function DataTableColumnHeader<TData>({
  column,
  title,
}: DataTableColumnHeaderProps<TData>) {
  if (!column.getCanSort()) {
    return <div>{title}</div>;
  }

  const sortDirection = column.getIsSorted();

  let icon = ArrowUpDownIcon;
  if (sortDirection === 'asc') {
    icon = ArrowUp01Icon;
  } else if (sortDirection === 'desc') {
    icon = ArrowDown01Icon;
  }

  return (
    <Button
      onClick={() => column.toggleSorting(sortDirection === 'asc')}
      type="button"
      variant="ghost"
    >
      {title}
      <HugeiconsIcon className="ml-2 size-4" icon={icon} />
    </Button>
  );
}
