'use client';

import { UserRemove01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
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
import { useRemoveTeamMember } from '@/lib/queries';

type RemoveMemberDialogProps = {
  appId: string;
  userId: string;
  email: string;
  children?: React.ReactNode;
};

export function RemoveMemberDialog({
  appId,
  userId,
  email,
  children,
}: RemoveMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const removeMember = useRemoveTeamMember();

  const handleRemove = () => {
    removeMember.mutate(
      { appId, userId },
      {
        onSuccess: () => {
          setOpen(false);
        },
      }
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      removeMember.reset();
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        {children || (
          <Button
            className="w-full sm:w-auto"
            size="sm"
            type="button"
            variant="destructive"
          >
            <HugeiconsIcon className="mr-1.5 size-3" icon={UserRemove01Icon} />
            Remove
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Team Member</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove{' '}
            <span className="font-semibold text-foreground">{email}</span> from
            the team? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={removeMember.isPending}
            onClick={() => setOpen(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={removeMember.isPending}
            onClick={handleRemove}
            type="button"
            variant="destructive"
          >
            {removeMember.isPending && <Spinner className="mr-2 size-4" />}
            {removeMember.isPending ? 'Removing' : 'Remove Member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
