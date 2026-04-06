'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useRevokePublicApiToken } from '@/lib/queries';

type RevokePublicApiTokenDialogProps = {
  appId: string;
  tokenId: string;
  tokenName: string;
  children: React.ReactNode;
};

export function RevokePublicApiTokenDialog({
  appId,
  tokenId,
  tokenName,
  children,
}: RevokePublicApiTokenDialogProps) {
  const revokeToken = useRevokePublicApiToken();
  const [open, setOpen] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      revokeToken.reset();
    }
  };

  const handleRevoke = () => {
    revokeToken.mutate(
      { appId, tokenId },
      {
        onSuccess: () => {
          setOpen(false);
        },
      }
    );
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke public API token</DialogTitle>
          <DialogDescription>
            Revoke{' '}
            <span className="font-medium text-foreground">{tokenName}</span>.
            Any scripts or services using this token will stop working on their
            next request.
          </DialogDescription>
        </DialogHeader>

        {revokeToken.error && (
          <p className="text-destructive text-sm">
            {revokeToken.error.message || 'Failed to revoke token'}
          </p>
        )}

        <DialogFooter>
          <Button
            disabled={revokeToken.isPending}
            onClick={() => setOpen(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className="relative"
            disabled={revokeToken.isPending}
            onClick={handleRevoke}
            type="button"
            variant="destructive"
          >
            {revokeToken.isPending && (
              <Spinner className="absolute inset-0 m-auto size-4" />
            )}
            <span className={revokeToken.isPending ? 'invisible' : ''}>
              Revoke token
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
