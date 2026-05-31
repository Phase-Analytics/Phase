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
import { useDeleteLinkDomain } from '@/lib/queries';
import { toast } from 'sonner';

type RemoveLinkDomainDialogProps = {
  appId: string;
  domainId: string;
  hostname: string;
  children: React.ReactNode;
};

export function RemoveLinkDomainDialog({
  appId,
  domainId,
  hostname,
  children,
}: RemoveLinkDomainDialogProps) {
  const [open, setOpen] = useState(false);
  const deleteDomain = useDeleteLinkDomain(appId);

  const handleRemove = () => {
    deleteDomain.mutate(domainId, {
      onSuccess: () => {
        toast.success('Domain removed');
        setOpen(false);
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to remove domain');
      },
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      deleteDomain.reset();
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove domain</DialogTitle>
          <DialogDescription>
            Remove{' '}
            <span className="font-semibold text-foreground">{hostname}</span>?
            Links using this domain will stop working on that host.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={deleteDomain.isPending}
            onClick={() => setOpen(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className="relative"
            disabled={deleteDomain.isPending}
            onClick={handleRemove}
            type="button"
            variant="destructive"
          >
            {deleteDomain.isPending && (
              <Spinner className="absolute inset-0 m-auto size-4" />
            )}
            <span className={deleteDomain.isPending ? 'invisible' : ''}>
              Remove
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
