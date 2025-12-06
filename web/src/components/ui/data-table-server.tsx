'use client';

import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  CheckmarkSquare01Icon,
  FilterIcon,
  FolderSearchIcon,
  Search01Icon,
  ViewIcon,
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

type FilterOption = {
  label: string;
  value: string;
  icon?: typeof CheckmarkSquare01Icon;
};

type DataTableServerProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pagination: PaginationResponse;
  isLoading?: boolean;
  searchKey?: string;
  searchPlaceholder?: string;
  filterKey?: string;
  filterOptions?: FilterOption[];
  filterPlaceholder?: string;
  filterAllIcon?: typeof CheckmarkSquare01Icon;
  onRowClick?: (row: TData) => void;
};

export function DataTableServer<TData, TValue>({
  columns,
  data,
  pagination,
  isLoading = false,
  searchKey,
  searchPlaceholder = 'Search...',
  filterKey,
  filterOptions = [],
  filterPlaceholder = 'All',
  filterAllIcon,
  onRowClick,
}: DataTableServerProps<TData, TValue>) {
  const { pageSize, setPageSize } = usePaginationStore();

  const [params, setParams] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      search: parseAsString.withDefault(''),
      filter: parseAsString.withDefault(''),
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
    setParams({ page: 1 });
  };

  const handleFilterChange = (value: string) => {
    setParams({ filter: value, page: 1 });
  };

  const currentFilterOption = params.filter
    ? filterOptions.find((opt) => opt.value === params.filter)
    : null;

  const currentFilterLabel = currentFilterOption?.label || filterPlaceholder;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {searchKey && (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Input
              className="flex-1 sm:w-56 sm:flex-none"
              disabled={isLoading}
              onChange={(event) => setSearchValue(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              type="text"
              value={searchValue}
            />
            <Button
              className="flex-shrink-0"
              disabled={isLoading}
              onClick={handleSearchSubmit}
              size="sm"
              type="button"
              variant="secondary"
            >
              <HugeiconsIcon icon={Search01Icon} />
              <span className="hidden sm:inline">Search</span>
            </Button>
          </div>
        )}

        {filterKey && filterOptions.length > 0 && isMounted && (
          <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className={`w-full flex-shrink-0 sm:w-auto ${params.filter ? 'shadow-[0_0_0_2px] shadow-primary/30' : ''}`}
                  disabled={isLoading}
                  size="sm"
                  variant={params.filter ? 'default' : 'outline'}
                >
                  <HugeiconsIcon icon={FilterIcon} />
                  {currentFilterLabel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleFilterChange('')}>
                  {filterAllIcon && <HugeiconsIcon icon={filterAllIcon} />}
                  All
                </DropdownMenuItem>
                {filterOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => handleFilterChange(option.value)}
                  >
                    {option.icon && <HugeiconsIcon icon={option.icon} />}
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    className="bg-muted/50 font-semibold text-muted-foreground text-xs uppercase"
                    key={header.id}
                    style={{
                      width: header.getSize(),
                      minWidth: header.column.columnDef.minSize,
                    }}
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
                  <TableHead className="w-12 bg-muted/50 font-semibold text-muted-foreground text-xs uppercase" />
                )}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: pageSize }, (_, i) => i).map(
                  (rowIndex) => {
                    const headers = table.getHeaderGroups()[0]?.headers || [];
                    return (
                      <TableRow key={`loading-row-${rowIndex}`}>
                        {headers.map((header) => (
                          <TableCell
                            key={`loading-${rowIndex}-${header.id}`}
                            style={{
                              width: header.getSize(),
                              minWidth: header.column.columnDef.minSize,
                            }}
                          >
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                        {onRowClick && (
                          <TableCell className="w-12 text-center">
                            <Skeleton className="mx-auto h-5 w-5" />
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  }
                )
              : null}

            {!isLoading && table.getRowModel().rows?.length
              ? table.getRowModel().rows.map((row) => {
                  const cells = row.getVisibleCells();
                  return (
                    <TableRow
                      className={onRowClick ? 'cursor-pointer' : ''}
                      key={row.id}
                      onClick={() => onRowClick?.(row.original)}
                    >
                      {cells.map((cell) => (
                        <TableCell
                          key={cell.id}
                          style={{
                            width: cell.column.getSize(),
                            minWidth: cell.column.columnDef.minSize,
                          }}
                        >
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
              : null}

            {isLoading || table.getRowModel().rows?.length ? null : (
              <TableRow>
                <TableCell
                  className="h-32 text-center"
                  colSpan={columns.length + (onRowClick ? 1 : 0)}
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
          <HugeiconsIcon icon={ArrowLeft01Icon} />
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
                  Rows: {pageSize}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                {[10, 25].map((size) => (
                  <DropdownMenuItem
                    key={size}
                    onClick={() => handlePageSizeChange(size)}
                  >
                    <HugeiconsIcon
                      className={
                        pageSize === size ? 'opacity-100' : 'opacity-0'
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
              Rows: {pageSize}
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
          <span className="hidden md:inline">Next</span>
          <HugeiconsIcon icon={ArrowRight01Icon} />
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
