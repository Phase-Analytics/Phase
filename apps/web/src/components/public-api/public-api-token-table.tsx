import type { ColumnDef } from '@tanstack/react-table';
import { ClientDate } from '@/components/client-date';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { PublicApiToken } from '@/lib/api/types';
import { CreatePublicApiTokenDialog } from './create-public-api-token-dialog';
import { RevokePublicApiTokenDialog } from './revoke-public-api-token-dialog';

type PublicApiTokenTableProps = {
  appId: string;
  tokens?: PublicApiToken[];
  isLoading?: boolean;
  isOwner: boolean;
};

export function PublicApiTokenTable({
  appId,
  tokens,
  isLoading,
  isOwner,
}: PublicApiTokenTableProps) {
  const columns: ColumnDef<PublicApiToken>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium text-sm">{row.original.name}</p>
        </div>
      ),
    },
    {
      accessorKey: 'tokenPrefix',
      header: 'Prefix',
      cell: ({ row }) => (
        <p className="font-mono text-muted-foreground text-sm">
          {row.original.tokenPrefix}••••••
        </p>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => (
        <div className="text-muted-foreground text-sm">
          <ClientDate date={row.original.createdAt} format="datetime-long" />
        </div>
      ),
    },
    {
      accessorKey: 'lastUsedAt',
      header: 'Last used',
      cell: ({ row }) => (
        <div className="text-muted-foreground text-sm">
          {row.original.lastUsedAt ? (
            <ClientDate date={row.original.lastUsedAt} format="datetime-long" />
          ) : (
            'Never'
          )}
        </div>
      ),
    },
    {
      accessorKey: 'expiresAt',
      header: 'Expires',
      cell: ({ row }) => (
        <div className="text-muted-foreground text-sm">
          {row.original.expiresAt ? (
            <ClientDate date={row.original.expiresAt} format="datetime-long" />
          ) : (
            'No expiry'
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const token = row.original;
        const isRevokable = isOwner && token.status !== 'revoked';

        if (isRevokable) {
          return (
            <RevokePublicApiTokenDialog
              appId={appId}
              tokenId={token.id}
              tokenName={token.name}
            >
              <Button size="sm" type="button" variant="destructive">
                Revoke
              </Button>
            </RevokePublicApiTokenDialog>
          );
        }

        return (
          <span className="text-muted-foreground text-sm">
            {token.status === 'revoked' ? 'Revoked' : 'Owner only'}
          </span>
        );
      },
    },
  ];

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold text-sm">Public API tokens</h3>
            <p className="text-muted-foreground text-sm">
              Manage separate read-only credentials for external dashboards,
              scripts, and curated reporting integrations.
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={isOwner ? undefined : 0}>
                <CreatePublicApiTokenDialog appId={appId} disabled={!isOwner}>
                  <Button disabled={!isOwner} type="button">
                    Create token
                  </Button>
                </CreatePublicApiTokenDialog>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {isOwner ? 'Create token' : 'Owner only'}
            </TooltipContent>
          </Tooltip>
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
            data={tokens ?? []}
            pageSize={10}
            searchKey="name"
            searchPlaceholder="Search tokens..."
          />
        )}
      </CardContent>
    </Card>
  );
}
