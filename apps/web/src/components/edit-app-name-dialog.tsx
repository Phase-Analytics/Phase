'use client';

import { PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { APP_NAME } from '@phase/shared/constants/validation';
import { useForm } from '@tanstack/react-form';
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
import { AutoHeight } from '@/components/ui/primitives/effects/auto-height';
import { Spinner } from '@/components/ui/spinner';
import { useRenameApp } from '@/lib/queries';

type EditAppNameDialogProps = {
  appId: string;
  currentName: string;
  disabled?: boolean;
  children?: React.ReactNode;
};

export function EditAppNameDialog({
  appId,
  currentName,
  disabled = false,
  children,
}: EditAppNameDialogProps) {
  const [open, setOpen] = useState(false);
  const renameApp = useRenameApp();

  const form = useForm({
    defaultValues: {
      name: currentName,
    },
    onSubmit: ({ value }) => {
      renameApp.mutate(
        { appId, data: { name: value.name.trim() } },
        {
          onSuccess: () => {
            setOpen(false);
            form.reset();
          },
        }
      );
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      form.setFieldValue('name', currentName);
    } else {
      form.reset();
      renameApp.reset();
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild disabled={disabled}>
        {children || (
          <Button disabled={disabled} size="sm" type="button" variant="outline">
            <HugeiconsIcon className="mr-1.5 size-3" icon={PencilEdit02Icon} />
            Edit
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
            <DialogTitle>Edit Application Name</DialogTitle>
            <DialogDescription>
              Change the name of your application. This will be visible to all
              team members.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <form.Subscribe selector={(state) => state.submissionAttempts}>
              {(submissionAttempts) => (
                <form.Field
                  name="name"
                  validators={{
                    onChange: ({ value }) => {
                      const trimmedValue = value.trim();

                      if (trimmedValue.length === 0) {
                        return 'Application name is required';
                      }

                      if (trimmedValue.length < APP_NAME.MIN_LENGTH) {
                        return `Application name must be at least ${APP_NAME.MIN_LENGTH} characters`;
                      }

                      if (trimmedValue.length > APP_NAME.MAX_LENGTH) {
                        return `Application name must be at most ${APP_NAME.MAX_LENGTH} characters`;
                      }

                      if (!APP_NAME.PATTERN.test(trimmedValue)) {
                        return 'Application name can only contain letters, numbers, spaces, and hyphens';
                      }

                      return;
                    },
                  }}
                >
                  {(field) => {
                    const showErrors =
                      submissionAttempts > 0 &&
                      field.state.meta.errors.length > 0;
                    return (
                      <div className="space-y-2">
                        <label
                          className="font-medium text-sm"
                          htmlFor="app-name"
                        >
                          Application Name
                        </label>
                        <Input
                          aria-invalid={showErrors}
                          autoComplete="off"
                          disabled={renameApp.isPending}
                          id="app-name"
                          maxLength={APP_NAME.MAX_LENGTH}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          placeholder="Enter application name"
                          type="text"
                          value={field.state.value}
                        />
                        <AutoHeight
                          deps={[showErrors, renameApp.error?.message]}
                        >
                          {showErrors && (
                            <p className="text-destructive text-sm">
                              {field.state.meta.errors[0]}
                            </p>
                          )}
                          {renameApp.error && (
                            <p className="text-destructive text-sm">
                              {renameApp.error.message ||
                                'Failed to rename app'}
                            </p>
                          )}
                        </AutoHeight>
                      </div>
                    );
                  }}
                </form.Field>
              )}
            </form.Subscribe>
          </div>
          <DialogFooter>
            <Button
              disabled={renameApp.isPending}
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) =>
                [
                  state.canSubmit,
                  state.isSubmitting,
                  state.submissionAttempts,
                ] as const
              }
            >
              {([canSubmit, isSubmitting, submissionAttempts]) => (
                <Button
                  className="relative"
                  disabled={
                    (submissionAttempts > 0 && !canSubmit) ||
                    renameApp.isPending ||
                    isSubmitting
                  }
                  type="submit"
                >
                  {renameApp.isPending && (
                    <Spinner className="absolute inset-0 m-auto size-4" />
                  )}
                  <span className={renameApp.isPending ? 'invisible' : ''}>
                    Save Changes
                  </span>
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
