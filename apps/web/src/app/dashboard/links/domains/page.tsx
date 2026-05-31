'use client';

import type { LinkDomain } from '@phase/shared';
import { parseAsString, useQueryState } from 'nuqs';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-page-header';
import { AddDomainDialog } from '@/components/links/add-domain-dialog';
import { DomainsIntroCard } from '@/components/links/domains-intro-card';
import { LinkDomainDnsDialog } from '@/components/links/link-domain-dns-dialog';
import { LinkDomainStatusBadge } from '@/components/links/link-domain-status-badge';
import { RemoveLinkDomainDialog } from '@/components/links/remove-link-domain-dialog';
import { RequireApp } from '@/components/require-app';
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
import { useLinkDomains, useVerifyLinkDomain } from '@/lib/queries';

export default function LinkDomainsPage() {
  const [appId] = useQueryState('app', parseAsString);
  const { data, isPending } = useLinkDomains(appId ?? '');
  const verifyDomain = useVerifyLinkDomain(appId ?? '');
  const [dnsDialogHostname, setDnsDialogHostname] = useState<string | null>(
    null
  );

  const counts = useMemo(() => {
    const domains = data?.domains ?? [];
    return {
      total: domains.length,
      verified: domains.filter((d) => d.status === 'verified').length,
      pending: domains.filter((d) => d.status === 'pending').length,
    };
  }, [data?.domains]);

  const handleVerify = (domainId: string) => {
    verifyDomain.mutate(domainId, {
      onSuccess: (result) => {
        const domain = result as LinkDomain;
        if (domain.status === 'verified') {
          toast.success('Domain verified');
          return;
        }
        toast.error(domain.lastError ?? 'Verification failed');
      },
      onError: (error) => {
        toast.error(error.message || 'Verification failed');
      },
    });
  };

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <DashboardPageHeader
          actions={appId ? <AddDomainDialog appId={appId} /> : null}
          description="Branded hostnames for your short links"
          title="Domains"
        />

        <DomainsIntroCard />

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
                <p className="text-muted-foreground text-sm">Verified</p>
                <p className="font-bold text-2xl tabular-nums">
                  {counts.verified}
                </p>
              </CardContent>
            </Card>
            <Card className="py-0">
              <CardContent className="p-4">
                <p className="text-muted-foreground text-sm">Pending</p>
                <p className="font-bold text-2xl tabular-nums">
                  {counts.pending}
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
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hostname</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.domains.length === 0 ? (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={3}>
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
                          <LinkDomainStatusBadge
                            onDnsInfoClick={() =>
                              setDnsDialogHostname(domain.hostname)
                            }
                            status={domain.status}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {domain.status !== 'verified' ? (
                              <Button
                                disabled={verifyDomain.isPending}
                                onClick={() => handleVerify(domain.id)}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                Verify
                              </Button>
                            ) : null}
                            <RemoveLinkDomainDialog
                              appId={appId ?? ''}
                              domainId={domain.id}
                              hostname={domain.hostname}
                            >
                              <Button
                                size="sm"
                                type="button"
                                variant="destructive"
                              >
                                Remove
                              </Button>
                            </RemoveLinkDomainDialog>
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

        {dnsDialogHostname ? (
          <LinkDomainDnsDialog
            hostname={dnsDialogHostname}
            onOpenChange={(open) => {
              if (!open) {
                setDnsDialogHostname(null);
              }
            }}
            open={Boolean(dnsDialogHostname)}
          />
        ) : null}
      </div>
    </RequireApp>
  );
}
