'use client';

import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  CheckmarkSquare01Icon,
  FolderSearchIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { type KeyboardEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PaginationResponse } from '@/lib/api/types';
import { usePaginationStore } from '@/stores/pagination-store';

type DataTableServerProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pagination: PaginationResponse;
  isLoading?: boolean;
  searchKey?: string;
  searchPlaceholder?: string;
};

export function DataTableServer<TData, TValue>({
  columns,
  data,
  pagination,
  isLoading = false,
  searchKey,
  searchPlaceholder = 'Search...',
}: DataTableServerProps<TData, TValue>) {
  const { pageSize, setPageSize } = usePaginationStore();

  const [params, setParams] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      pageSize: parseAsInteger.withDefault(pageSize),
      search: parseAsString.withDefault(''),
    },
    {
      history: 'push',
    }
  );

  const [searchValue, setSearchValue] = useState(params.search);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: pagination.totalPages,
    columnResizeMode: 'onChange',
    enableColumnResizing: false,
  });

  const handlePreviousPage = () => {
    if (params.page > 1) {
      setParams({ page: params.page - 1 });
    }
  };

  const handleNextPage = () => {
    if (params.page < pagination.totalPages) {
      setParams({ page: params.page + 1 });
    }
  };

  const handleSearchSubmit = () => {
    setParams({ search: searchValue.trim(), page: 1 });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  useEffect(() => {
    setSearchValue(params.search);
  }, [params.search]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setParams({ pageSize: newSize, page: 1 });
  };

  return (
    <div className="w-full space-y-4">
      {searchKey && (
        <div className="flex items-center gap-2">
          <Input
            className="max-w-sm"
            disabled={isLoading}
            onChange={(event) => setSearchValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder}
            type="text"
            value={searchValue}
          />
          <Button
            disabled={isLoading}
            onClick={handleSearchSubmit}
            size="sm"
            type="button"
            variant="secondary"
          >
            Search
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
                    key={header.id}
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 10 }, (_, i) => i).map((rowIndex) => (
                  <TableRow key={`loading-row-${rowIndex}`}>
                    {table.getHeaderGroups()[0]?.headers.map((header) => (
                      <TableCell
                        key={`loading-${rowIndex}-${header.id}`}
                        style={{ width: header.getSize() }}
                      >
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : null}

            {!isLoading && table.getRowModel().rows?.length
              ? table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : null}

            {isLoading || table.getRowModel().rows?.length ? null : (
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

      <div className="flex items-center justify-between">
        <Button
          disabled={params.page === 1 || isLoading}
          onClick={handlePreviousPage}
          size="sm"
          type="button"
          variant="outline"
        >
          <HugeiconsIcon className="md:hidden" icon={ArrowLeft01Icon} />
          <span className="hidden md:inline">Previous</span>
        </Button>

        <div className="flex items-center gap-4">
          <div className="text-muted-foreground text-sm">
            {pagination.total > 0 ? (
              <>
                <span className="hidden sm:inline">
                  Page {pagination.page} of {pagination.totalPages} (
                  {pagination.total} total)
                </span>
                <span className="sm:hidden">
                  {pagination.page}/{pagination.totalPages}
                </span>
              </>
            ) : (
              'No results'
            )}
          </div>
          {isMounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={isLoading} size="sm" variant="outline">
                  Rows: {params.pageSize}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                {[5, 10, 15, 20, 25].map((size) => (
                  <DropdownMenuItem
                    key={size}
                    onClick={() => handlePageSizeChange(size)}
                  >
                    <HugeiconsIcon
                      className={
                        params.pageSize === size ? 'opacity-100' : 'opacity-0'
                      }
                      icon={CheckmarkSquare01Icon}
                    />
                    {size}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button disabled size="sm" variant="outline">
              Rows: {params.pageSize}
            </Button>
          )}
        </div>

        <Button
          disabled={params.page >= pagination.totalPages || isLoading}
          onClick={handleNextPage}
          size="sm"
          type="button"
          variant="outline"
        >
          <HugeiconsIcon className="md:hidden" icon={ArrowRight01Icon} />
          <span className="hidden md:inline">Next</span>
        </Button>
      </div>
    </div>
  );
}

type DataTableColumnHeaderServerProps = {
  title: string;
  sortKey: string;
};

export function DataTableColumnHeaderServer({
  title,
  sortKey,
}: DataTableColumnHeaderServerProps) {
  const [params, setParams] = useQueryStates(
    {
      sortBy: parseAsString,
      sortOrder: parseAsString,
    },
    {
      history: 'push',
    }
  );

  const isSorted = params.sortBy === sortKey;
  const isAsc = isSorted && params.sortOrder === 'asc';
  const isDesc = isSorted && params.sortOrder === 'desc';

  const handleSort = () => {
    if (!isSorted) {
      setParams({ sortBy: sortKey, sortOrder: 'asc' });
    } else if (isAsc) {
      setParams({ sortBy: sortKey, sortOrder: 'desc' });
    } else {
      setParams({ sortBy: null, sortOrder: null });
    }
  };

  let icon = ArrowUpDownIcon;
  if (isAsc) {
    icon = ArrowUp01Icon;
  } else if (isDesc) {
    icon = ArrowDown01Icon;
  }

  return (
    <Button onClick={handleSort} type="button" variant="ghost">
      {title}
      <HugeiconsIcon className="ml-2 size-4" icon={icon} />
    </Button>
  );
}
