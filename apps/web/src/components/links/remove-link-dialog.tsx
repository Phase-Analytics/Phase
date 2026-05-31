'use client';

import { useState } from 'react';
import { toast } from 'sonner';
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
import { useDeleteLink } from '@/lib/queries';

type RemoveLinkDialogProps = {
  appId: string;
  linkId: string;
  linkLabel: string;
  children: React.ReactNode;
};

export function RemoveLinkDialog({
  appId,
  linkId,
  linkLabel,
  children,
}: RemoveLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const deleteLink = useDeleteLink(appId);

  const handleRemove = () => {
    deleteLink.mutate(linkId, {
      onSuccess: () => {
        toast.success('Link deleted');
        setOpen(false);
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to delete link');
      },
    });
  };

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          deleteLink.reset();
        }
      }}
      open={open}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete link</DialogTitle>
          <DialogDescription>
            Delete{' '}
            <span className="font-semibold text-foreground">{linkLabel}</span>?
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={deleteLink.isPending}
            onClick={() => setOpen(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className="relative"
            disabled={deleteLink.isPending}
            onClick={handleRemove}
            type="button"
            variant="destructive"
          >
            {deleteLink.isPending && (
              <Spinner className="absolute inset-0 m-auto size-4" />
            )}
            <span className={deleteLink.isPending ? 'invisible' : ''}>
              Delete
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
