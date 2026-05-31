'use client';

import { CursorPointer01Icon, Edit02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { LinkListItem } from '@phase/shared';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { CreateLinkDialog } from '@/components/links/create-link-dialog';
import { EditLinkDialog } from '@/components/links/edit-link-dialog';
import { LinkStatusBadge } from '@/components/links/link-status-badge';
import { RemoveLinkDialog } from '@/components/links/remove-link-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { DataTable } from '@/components/ui/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatUrlWithoutProtocol, getLinkStatus } from '@/lib/link-urls';

type LinksTableProps = {
  appId: string;
  links?: LinkListItem[];
  isLoading?: boolean;
};

function linkMatchesSearch(link: LinkListItem, query: string): boolean {
  const q = query.toLowerCase();
  return (
    link.slug.toLowerCase().includes(q) ||
    link.shortUrl.toLowerCase().includes(q) ||
    link.destinationUrl.toLowerCase().includes(q)
  );
}

export function LinksTable({ appId, links, isLoading }: LinksTableProps) {
  const columns: ColumnDef<LinkListItem>[] = [
    {
      accessorKey: 'shortUrl',
      header: 'Short link',
      filterFn: (row, _columnId, filterValue) => {
        const query = String(filterValue ?? '').trim();
        if (!query) {
          return true;
        }
        return linkMatchesSearch(row.original, query);
      },
      cell: ({ row }) => {
        const link = row.original;
        const shortDisplay = formatUrlWithoutProtocol(link.shortUrl);

        return (
          <div className="flex items-center gap-2">
            <Link
              className="font-medium hover:underline"
              href={`/dashboard/links/${link.id}?app=${appId}`}
            >
              {shortDisplay}
            </Link>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <CopyButton
                    content={link.shortUrl}
                    size="sm"
                    variant="outline"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>Copy link</TooltipContent>
            </Tooltip>
          </div>
        );
      },
    },
    {
      accessorKey: 'destinationUrl',
      header: 'Destination',
      cell: ({ row }) => (
        <span
          className="block max-w-xs truncate text-muted-foreground text-sm"
          title={formatUrlWithoutProtocol(row.original.destinationUrl)}
        >
          {formatUrlWithoutProtocol(row.original.destinationUrl)}
        </span>
      ),
    },
    {
      accessorKey: 'totalClicks',
      header: () => (
        <span className="inline-flex items-center gap-1.5">
          <HugeiconsIcon
            className="size-3.5 text-muted-foreground"
            icon={CursorPointer01Icon}
          />
          Clicks
        </span>
      ),
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">
          {row.original.totalClicks ?? 0}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <LinkStatusBadge status={getLinkStatus(row.original)} />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const link = row.original;
        const shortDisplay = formatUrlWithoutProtocol(link.shortUrl);

        return (
          <div className="flex flex-wrap gap-2">
            <EditLinkDialog appId={appId} linkId={link.id}>
              <Button size="sm" type="button" variant="outline">
                <HugeiconsIcon className="size-4" icon={Edit02Icon} />
                Edit
              </Button>
            </EditLinkDialog>
            <RemoveLinkDialog
              appId={appId}
              linkId={link.id}
              linkLabel={shortDisplay}
            >
              <Button size="sm" type="button" variant="destructive">
                Delete
              </Button>
            </RemoveLinkDialog>
          </div>
        );
      },
    },
  ];

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold text-sm">All links</h3>
            <p className="text-muted-foreground text-sm">
              Short links for this app
            </p>
          </div>
          <CreateLinkDialog appId={appId} />
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
            data={links ?? []}
            hideSearchClearButton
            pageSize={10}
            searchKey="shortUrl"
            searchPlaceholder="Search links..."
          />
        )}
      </CardContent>
    </Card>
  );
}
