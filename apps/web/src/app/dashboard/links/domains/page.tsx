'use client';

import type { LinkDomain } from '@phase/shared';
import { parseAsString, useQueryState } from 'nuqs';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-page-header';
import { AddDomainDialog } from '@/components/links/add-domain-dialog';
import { RequireApp } from '@/components/require-app';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useDeleteLinkDomain,
  useLinkDomains,
  useVerifyLinkDomain,
} from '@/lib/queries';

export default function LinkDomainsPage() {
  const [appId] = useQueryState('app', parseAsString);
  const { data, isPending } = useLinkDomains(appId ?? '');
  const verifyDomain = useVerifyLinkDomain(appId ?? '');
  const deleteDomain = useDeleteLinkDomain(appId ?? '');

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <DashboardPageHeader
          actions={appId ? <AddDomainDialog appId={appId} /> : null}
          description="Point a CNAME to cname.phase.sh — one DNS record"
          title="Domains"
        />

        <Card className="py-0">
          <CardContent className="p-0">
            {isPending ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hostname</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>CNAME target</TableHead>
                    <TableHead>Last check</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.domains.length === 0 ? (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={5}>
                        No domains yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.domains.map((domain: LinkDomain) => (
                      <TableRow key={domain.id}>
                        <TableCell className="font-medium">
                          {domain.hostname}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              domain.status === 'verified'
                                ? 'success'
                                : 'outline'
                            }
                          >
                            {domain.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {domain.cnameTarget}
                        </TableCell>
                        <TableCell className="max-w-xs text-muted-foreground text-sm">
                          {(() => {
                            if (
                              domain.status === 'failed' &&
                              domain.lastError
                            ) {
                              return domain.lastError;
                            }
                            if (domain.lastCheckAt) {
                              return new Date(
                                domain.lastCheckAt
                              ).toLocaleString();
                            }
                            return '—';
                          })()}
                        </TableCell>
                        <TableCell className="space-x-2 text-right">
                          {domain.status !== 'verified' ? (
                            <Button
                              disabled={verifyDomain.isPending}
                              onClick={() => verifyDomain.mutate(domain.id)}
                              size="sm"
                              variant="outline"
                            >
                              Verify
                            </Button>
                          ) : null}
                          <Button
                            onClick={() => deleteDomain.mutate(domain.id)}
                            size="sm"
                            variant="ghost"
                          >
                            Remove
                          </Button>
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
