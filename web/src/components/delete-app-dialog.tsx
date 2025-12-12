'use client';

import { Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
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
import { AutoHeight } from '@/components/ui/primitives/effects/auto-height';
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
  const deleteApp = useDeleteApp();

  const form = useForm({
    defaultValues: {
      confirmName: '',
    },
    onSubmit: () => {
      deleteApp.mutate(appId, {
        onSuccess: () => {
          setOpen(false);
          form.reset();
          onSuccess?.();
        },
      });
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
      deleteApp.reset();
    }
  };

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
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Delete Application</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the{' '}
              <span className="font-semibold text-foreground">{appName}</span>{' '}
              application and remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4 pb-2">
            <form.Field
              name="confirmName"
              validators={{
                onChange: ({ value }) => {
                  if (value !== appName) {
                    return `Please type "${appName}" to confirm`;
                  }
                  return;
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="confirm-name">
                    Please type your application name{' '}
                    <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                      {appName}
                      <CopyButton content={appName} size="xs" variant="ghost" />
                    </span>{' '}
                    to confirm
                  </label>
                  <Input
                    autoComplete="off"
                    disabled={deleteApp.isPending}
                    id="confirm-name"
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Enter application name"
                    type="text"
                    value={field.state.value}
                  />
                  <AutoHeight
                    deps={[
                      field.state.meta.errors.length,
                      deleteApp.error?.message,
                    ]}
                  >
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-destructive text-sm">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                    {deleteApp.error && (
                      <p className="text-destructive text-sm">
                        {deleteApp.error.message ||
                          'Failed to delete application'}
                      </p>
                    )}
                  </AutoHeight>
                </div>
              )}
            </form.Field>
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
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  disabled={!canSubmit || deleteApp.isPending || isSubmitting}
                  type="submit"
                  variant="destructive"
                >
                  {deleteApp.isPending && <Spinner className="mr-2 size-4" />}
                  {deleteApp.isPending ? 'Deleting' : 'Delete Application'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
