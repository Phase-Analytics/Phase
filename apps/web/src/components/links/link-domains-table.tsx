'use client';

import type { LinkDomain } from '@phase/shared';
import type { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import { toast } from 'sonner';
import { AddDomainDialog } from '@/components/links/add-domain-dialog';
import { LinkDomainDnsDialog } from '@/components/links/link-domain-dns-dialog';
import { LinkDomainStatusBadge } from '@/components/links/link-domain-status-badge';
import { RemoveLinkDomainDialog } from '@/components/links/remove-link-domain-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { useVerifyLinkDomain } from '@/lib/queries';

type LinkDomainsTableProps = {
  appId: string;
  domains?: LinkDomain[];
  isLoading?: boolean;
};

export function LinkDomainsTable({
  appId,
  domains,
  isLoading,
}: LinkDomainsTableProps) {
  const verifyDomain = useVerifyLinkDomain(appId);
  const [dnsDialogDomain, setDnsDialogDomain] = useState<LinkDomain | null>(
    null
  );

  const handleVerify = (domainId: string) => {
    verifyDomain.mutate(domainId, {
      onSuccess: (result) => {
        const domain = result as LinkDomain;
        if (domain.status === 'verified') {
          toast.success('Domain verified');
          return;
        }
        toast.info('DNS or certificate verification is still pending');
      },
      onError: () => {
        toast.error('Could not verify domain');
      },
    });
  };

  const columns: ColumnDef<LinkDomain>[] = [
    {
      accessorKey: 'hostname',
      header: 'Hostname',
      cell: ({ row }) => (
        <span className="font-medium text-sm">{row.original.hostname}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <LinkDomainStatusBadge
          onDnsInfoClick={() => setDnsDialogDomain(row.original)}
          status={row.original.status}
        />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const domain = row.original;

        return (
          <div className="flex flex-wrap gap-2">
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
              appId={appId}
              domainId={domain.id}
              hostname={domain.hostname}
            >
              <Button size="sm" type="button" variant="destructive">
                Remove
              </Button>
            </RemoveLinkDomainDialog>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Card className="py-0">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-semibold text-sm">All domains</h3>
              <p className="text-muted-foreground text-sm">
                Custom hostnames for short links
              </p>
            </div>
            <AddDomainDialog appId={appId} />
          </div>

          {isLoading ? (
            <div className="space-y-2 rounded-md border p-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={domains ?? []}
              hideSearchClearButton
              pageSize={10}
              searchKey="hostname"
              searchPlaceholder="Search domains..."
            />
          )}
        </CardContent>
      </Card>

      {dnsDialogDomain ? (
        <LinkDomainDnsDialog
          hostname={dnsDialogDomain.hostname}
          onOpenChange={(open) => {
            if (!open) {
              setDnsDialogDomain(null);
            }
          }}
          open={Boolean(dnsDialogDomain)}
          records={dnsDialogDomain.dnsRecords}
        />
      ) : null}
    </>
  );
}
