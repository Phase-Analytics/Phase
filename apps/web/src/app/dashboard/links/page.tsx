'use client';

import { Edit02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { parseAsString, useQueryState } from 'nuqs';
import { useMemo } from 'react';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-page-header';
import { CreateLinkDialog } from '@/components/links/create-link-dialog';
import { LinksIntroCard } from '@/components/links/links-intro-card';
import { RequireApp } from '@/components/require-app';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDeleteLink, useLinks } from '@/lib/queries';

export default function LinksPage() {
  const [appId] = useQueryState('app', parseAsString);
  const { data, isPending } = useLinks(appId ?? '');
  const deleteLink = useDeleteLink(appId ?? '');

  const counts = useMemo(() => {
    const links = data?.links ?? [];
    const now = Date.now();
    let active = 0;
    let inactive = 0;

    for (const link of links) {
      const expired =
        link.expiresAt && new Date(link.expiresAt).getTime() <= now;
      if (link.disabledAt || expired) {
        inactive += 1;
      } else {
        active += 1;
      }
    }

    return { total: links.length, active, inactive };
  }, [data?.links]);

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <DashboardPageHeader
          actions={appId ? <CreateLinkDialog appId={appId} /> : null}
          description="Create and manage short links"
          title="Links"
        />

        {appId ? <LinksIntroCard appId={appId} /> : null}

        {!isPending && data ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="py-0">
              <CardContent className="p-4">
                <p className="text-muted-foreground text-sm">Total</p>
                <p className="font-bold text-2xl tabular-nums">{counts.total}</p>
              </CardContent>
            </Card>
            <Card className="py-0">
              <CardContent className="p-4">
                <p className="text-muted-foreground text-sm">Active</p>
                <p className="font-bold text-2xl tabular-nums">{counts.active}</p>
              </CardContent>
            </Card>
            <Card className="py-0">
              <CardContent className="p-4">
                <p className="text-muted-foreground text-sm">Inactive</p>
                <p className="font-bold text-2xl tabular-nums">
                  {counts.inactive}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <Card className="py-0">
          <CardContent className="p-0">
            {isPending ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Short link</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.links.length === 0 ? (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={4}>
                        No links yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.links.map((link) => (
                      <TableRow key={link.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link
                              className="font-medium hover:underline"
                              href={`/dashboard/links/${link.id}?app=${appId}`}
                            >
                              {link.shortUrl.replace('https://', '')}
                            </Link>
                            <CopyButton content={link.shortUrl} />
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {link.destinationUrl}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            if (link.disabledAt) {
                              return 'Disabled';
                            }
                            if (link.expiresAt) {
                              return `Expires ${new Date(link.expiresAt).toLocaleDateString()}`;
                            }
                            return 'Active';
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button asChild size="sm" variant="ghost">
                              <Link
                                href={`/dashboard/links/${link.id}?app=${appId}`}
                              >
                                <HugeiconsIcon
                                  className="size-4"
                                  icon={Edit02Icon}
                                />
                              </Link>
                            </Button>
                            <Button
                              onClick={() => deleteLink.mutate(link.id)}
                              size="sm"
                              variant="ghost"
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </RequireApp>
  );
}
