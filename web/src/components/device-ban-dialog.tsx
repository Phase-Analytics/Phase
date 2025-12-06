'use client';

import { UserBlock01Icon } from '@hugeicons/core-free-icons';
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
import { useDeleteDevice } from '@/lib/queries';

type DeviceBanDialogProps = {
  deviceId: string;
  appId: string;
  children?: React.ReactNode;
  onSuccess?: () => void;
};

export function DeviceBanDialog({
  deviceId,
  appId,
  children,
  onSuccess,
}: DeviceBanDialogProps) {
  const [open, setOpen] = useState(false);
  const deleteDevice = useDeleteDevice();

  const handleBan = () => {
    deleteDevice.mutate(
      { deviceId, appId },
      {
        onSuccess: () => {
          setOpen(false);
          onSuccess?.();
        },
      }
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      deleteDevice.reset();
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        {children || (
          <Button type="button" variant="destructive">
            <HugeiconsIcon className="size-4" icon={UserBlock01Icon} />
            Ban User
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban User</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently ban this user
            and delete all associated sessions and data. The user will no longer
            be able to send data to your application.
          </DialogDescription>
        </DialogHeader>
        {deleteDevice.error && (
          <p className="text-destructive text-sm">
            {deleteDevice.error.message || 'Failed to ban user'}
          </p>
        )}
        <DialogFooter>
          <Button
            disabled={deleteDevice.isPending}
            onClick={() => setOpen(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={deleteDevice.isPending}
            onClick={handleBan}
            type="button"
            variant="destructive"
          >
            {deleteDevice.isPending && <Spinner className="mr-2 size-4" />}
            {deleteDevice.isPending ? 'Banning' : 'Ban User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
