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
import { useDeletePolicy } from '@/lib/queries';

type RemovePolicyDialogProps = {
  appId: string;
  policyId: string;
  policyLabel: string;
  children: React.ReactNode;
  onDeleted?: () => void;
};

export function RemovePolicyDialog({
  appId,
  policyId,
  policyLabel,
  children,
  onDeleted,
}: RemovePolicyDialogProps) {
  const [open, setOpen] = useState(false);
  const deletePolicy = useDeletePolicy(appId);

  const handleRemove = () => {
    deletePolicy.mutate(policyId, {
      onSuccess: () => {
        toast.success('Policy deleted');
        setOpen(false);
        onDeleted?.();
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to delete policy');
      },
    });
  };

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          deletePolicy.reset();
        }
      }}
      open={open}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete policy</DialogTitle>
          <DialogDescription>
            Delete{' '}
            <span className="font-semibold text-foreground">{policyLabel}</span>
            ? This cannot be undone. The public URL will stop working.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={deletePolicy.isPending}
            onClick={() => setOpen(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className="relative"
            disabled={deletePolicy.isPending}
            onClick={handleRemove}
            type="button"
            variant="destructive"
          >
            {deletePolicy.isPending ? <Spinner className="size-4" /> : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
