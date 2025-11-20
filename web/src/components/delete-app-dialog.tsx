'use client';

import { Delete02Icon } from '@hugeicons/core-free-icons';
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
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useDeleteApp } from '@/lib/queries';

type DeleteAppDialogProps = {
  appId: string;
  appName: string;
  children?: React.ReactNode;
  onSuccess?: () => void;
};

export function DeleteAppDialog({
  appId,
  appName,
  children,
  onSuccess,
}: DeleteAppDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const deleteApp = useDeleteApp();

  const handleDelete = () => {
    if (confirmName !== appName) {
      return;
    }

    deleteApp.mutate(appId, {
      onSuccess: () => {
        setOpen(false);
        setConfirmName('');
        onSuccess?.();
      },
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setConfirmName('');
      deleteApp.reset();
    }
  };

  const isValid = confirmName === appName;

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        {children || (
          <Button type="button" variant="destructive">
            <HugeiconsIcon className="mr-2 size-4" icon={Delete02Icon} />
            Delete Application
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Application</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the{' '}
            <span className="font-semibold text-foreground">{appName}</span>{' '}
            application and remove all associated data.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-4 pb-2">
          <label className="font-medium text-sm" htmlFor="confirm-name">
            Please type your application name{' '}
            <span className="font-semibold text-foreground">"{appName}"</span>{' '}
            to confirm
          </label>
          <Input
            autoComplete="off"
            disabled={deleteApp.isPending}
            id="confirm-name"
            onChange={(event) => setConfirmName(event.target.value)}
            placeholder="Enter application name"
            type="text"
            value={confirmName}
          />
        </div>
        <DialogFooter>
          <Button
            disabled={deleteApp.isPending}
            onClick={() => setOpen(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={!isValid || deleteApp.isPending}
            onClick={handleDelete}
            type="button"
            variant="destructive"
          >
            {deleteApp.isPending && <Spinner className="mr-2 size-4" />}
            {deleteApp.isPending ? 'Deleting' : 'Delete Application'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
