'use client';

import { AddSquareIcon, Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { PolicyListItem } from '@phase/shared';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { CreatePolicyDialog } from '@/components/policies/create-policy-dialog';
import { RemovePolicyDialog } from '@/components/policies/remove-policy-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { DataTable } from '@/components/ui/data-table';
import { Skeleton } from '@/components/ui/skeleton';

type PoliciesTableProps = {
  appId: string;
  policies?: PolicyListItem[];
  isLoading?: boolean;
};

const PROTOCOL_PREFIX_RE = /^https?:\/\//;

function formatDisplayDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatUrlWithoutProtocol(url: string): string {
  return url.replace(PROTOCOL_PREFIX_RE, '');
}

export function PoliciesTable({
  appId,
  policies,
  isLoading,
}: PoliciesTableProps) {
  const columns: ColumnDef<PolicyListItem>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      filterFn: (row, _columnId, filterValue) => {
        const query = String(filterValue ?? '')
          .trim()
          .toLowerCase();
        if (!query) {
          return true;
        }
        const policy = row.original;
        return (
          policy.name.toLowerCase().includes(query) ||
          policy.slug.toLowerCase().includes(query)
        );
      },
      cell: ({ row }) => {
        const policy = row.original;
        return (
          <Link
            className="block max-w-xs truncate font-medium hover:underline lg:max-w-sm"
            href={`/dashboard/policies/${policy.id}?app=${appId}`}
            title={policy.name}
          >
            {policy.name}
          </Link>
        );
      },
    },
    {
      accessorKey: 'slug',
      header: 'Short link',
      cell: ({ row }) => {
        const display = formatUrlWithoutProtocol(row.original.publicUrl);
        return (
          <div className="flex max-w-xs items-center gap-2 lg:max-w-sm">
            <a
              className="truncate text-muted-foreground text-sm hover:underline"
              href={row.original.publicUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {display}
            </a>
            <CopyButton
              className="size-7 shrink-0"
              content={row.original.publicUrl}
              size="xs"
              variant="ghost"
            />
          </div>
        );
      },
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {formatDisplayDate(row.original.date)}
        </span>
      ),
    },
    {
      accessorKey: 'totalClicks',
      header: 'Clicks',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {row.original.totalClicks ?? 0}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <RemovePolicyDialog
            appId={appId}
            policyId={row.original.id}
            policyLabel={row.original.name}
          >
            <Button size="sm" type="button" variant="ghost">
              <HugeiconsIcon
                className="size-4 text-destructive"
                icon={Delete02Icon}
              />
              <span className="sr-only">Delete</span>
            </Button>
          </RemovePolicyDialog>
        </div>
      ),
    },
  ];

  const rows = policies ?? [];

  if (!isLoading && rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-muted-foreground text-sm">
            Host Terms of Service, Privacy Policies, and other legal docs as
            short links.
          </p>
          <CreatePolicyDialog appId={appId}>
            <Button type="button">
              <HugeiconsIcon className="size-4" icon={AddSquareIcon} />
              Create policy
            </Button>
          </CreatePolicyDialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold text-sm">All policies</h3>
            <p className="text-muted-foreground text-sm">
              Legal documents with short links
            </p>
          </div>
          <CreatePolicyDialog appId={appId}>
            <Button type="button">
              <HugeiconsIcon className="size-4" icon={AddSquareIcon} />
              Create policy
            </Button>
          </CreatePolicyDialog>
        </div>

        {isLoading ? (
          <div className="space-y-2 rounded-md border p-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            hideSearchClearButton
            pageSize={10}
            searchKey="name"
            searchPlaceholder="Search policies..."
          />
        )}
      </CardContent>
    </Card>
  );
}
