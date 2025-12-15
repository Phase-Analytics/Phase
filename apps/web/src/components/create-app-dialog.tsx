'use client';

import { AddSquareIcon } from '@hugeicons/core-free-icons';
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
import { useCreateApp } from '@/lib/queries';

type CreateAppDialogProps = {
  children?: React.ReactNode;
  onSuccess?: (appId: string) => void;
};

export function CreateAppDialog({ children, onSuccess }: CreateAppDialogProps) {
  const [open, setOpen] = useState(false);
  const createApp = useCreateApp();

  const form = useForm({
    defaultValues: {
      name: '',
    },
    onSubmit: ({ value }) => {
      createApp.mutate(
        { name: value.name.trim() },
        {
          onSuccess: (data) => {
            setOpen(false);
            form.reset();
            onSuccess?.(data.id);
          },
        }
      );
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
      createApp.reset();
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        {children || (
          <Button type="button" variant="success">
            <HugeiconsIcon className="mr-2 size-4" icon={AddSquareIcon} />
            Create New
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
            <DialogTitle>Create New Application</DialogTitle>
            <DialogDescription>
              Give your application a name to get started with analytics.
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
                        <Input
                          aria-invalid={showErrors}
                          autoComplete="off"
                          disabled={createApp.isPending}
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
                          deps={[showErrors, createApp.error?.message]}
                        >
                          {showErrors && (
                            <p className="text-destructive text-sm">
                              {field.state.meta.errors[0]}
                            </p>
                          )}
                          {createApp.error && (
                            <p className="text-destructive text-sm">
                              {createApp.error.message ||
                                'Failed to create application'}
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
              disabled={createApp.isPending}
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
                  disabled={
                    (submissionAttempts > 0 && !canSubmit) ||
                    createApp.isPending ||
                    isSubmitting
                  }
                  type="submit"
                >
                  {createApp.isPending && <Spinner className="mr-2 size-4" />}
                  {createApp.isPending ? 'Creating' : 'Create'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
