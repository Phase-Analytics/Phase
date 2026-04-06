import { ClientDate } from '@/components/client-date';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type {
  CreatePublicApiTokenResponse,
  PublicApiToken,
} from '@/lib/api/types';
import { CreatePublicApiTokenDialog } from './create-public-api-token-dialog';
import { PublicApiScopeBadges } from './public-api-scope-badges';
import { RevokePublicApiTokenDialog } from './revoke-public-api-token-dialog';

type PublicApiTokenTableProps = {
  appId: string;
  tokens?: PublicApiToken[];
  isLoading?: boolean;
  isOwner: boolean;
  onCreated?: (token: CreatePublicApiTokenResponse) => void;
};

function getStatusVariant(status: PublicApiToken['status']) {
  if (status === 'active') {
    return 'success' as const;
  }

  if (status === 'revoked') {
    return 'destructive' as const;
  }

  return 'outline' as const;
}

export function PublicApiTokenTable({
  appId,
  tokens,
  isLoading,
  isOwner,
  onCreated,
}: PublicApiTokenTableProps) {
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
                <CreatePublicApiTokenDialog
                  appId={appId}
                  disabled={!isOwner}
                  onCreated={onCreated}
                >
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

        {isOwner ? null : (
          <div className="rounded-lg border bg-muted/20 p-3 text-muted-foreground text-sm">
            Members can inspect token metadata, but only app owners can create
            or revoke Public API tokens.
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens?.length ? (
                  tokens.map((token) => {
                    const isRevokable = isOwner && token.status !== 'revoked';

                    return (
                      <TableRow key={token.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-sm">{token.name}</p>
                            <p className="font-mono text-muted-foreground text-xs">
                              {token.tokenPrefix}••••••
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <PublicApiScopeBadges scopes={token.scopes} />
                        </TableCell>
                        <TableCell>
                          <Badge
                            className="rounded-full capitalize"
                            variant={getStatusVariant(token.status)}
                          >
                            {token.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          <ClientDate
                            date={token.createdAt}
                            format="datetime-long"
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {token.lastUsedAt ? (
                            <ClientDate
                              date={token.lastUsedAt}
                              format="datetime-long"
                            />
                          ) : (
                            'Never'
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {token.expiresAt ? (
                            <ClientDate
                              date={token.expiresAt}
                              format="datetime-long"
                            />
                          ) : (
                            'No expiry'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isRevokable ? (
                            <RevokePublicApiTokenDialog
                              appId={appId}
                              tokenId={token.id}
                              tokenName={token.name}
                            >
                              <Button
                                size="sm"
                                type="button"
                                variant="destructive"
                              >
                                Revoke
                              </Button>
                            </RevokePublicApiTokenDialog>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              {token.status === 'revoked'
                                ? 'Revoked'
                                : 'Owner only'}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      className="py-8 text-center text-muted-foreground"
                      colSpan={7}
                    >
                      No public API tokens yet. Create one to enable read-only
                      access from external systems.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
