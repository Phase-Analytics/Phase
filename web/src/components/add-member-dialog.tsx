'use client';

import { UserAdd01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
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
import { useAddTeamMember } from '@/lib/queries';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AddMemberDialogProps = {
  appId: string;
  children?: React.ReactNode;
};

export function AddMemberDialog({ appId, children }: AddMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const addMember = useAddTeamMember();

  const form = useForm({
    defaultValues: {
      email: '',
    },
    onSubmit: ({ value }) => {
      addMember.mutate(
        { appId, data: { email: value.email.trim() } },
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
    if (!newOpen) {
      form.reset();
      addMember.reset();
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        {children || (
          <Button type="button" variant="default">
            <HugeiconsIcon className="mr-2 size-4" icon={UserAdd01Icon} />
            Add Member
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
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Enter the email address of the user you want to add to your team.
              They must have a Telemetra account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <form.Subscribe selector={(state) => state.submissionAttempts}>
              {(submissionAttempts) => (
                <form.Field
                  name="email"
                  validators={{
                    onChange: ({ value }) => {
                      const trimmedValue = value.trim();

                      if (!trimmedValue) {
                        return 'Email is required';
                      }

                      if (!EMAIL_REGEX.test(trimmedValue)) {
                        return 'Please enter a valid email address';
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
                          htmlFor="member-email"
                        >
                          Email Address
                        </label>
                        <Input
                          autoComplete="off"
                          disabled={addMember.isPending}
                          id="member-email"
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          placeholder="member@example.com"
                          type="email"
                          value={field.state.value}
                        />
                        <AutoHeight
                          deps={[showErrors, addMember.error?.message]}
                        >
                          {showErrors && (
                            <p className="text-destructive text-sm">
                              {field.state.meta.errors[0]}
                            </p>
                          )}
                          {addMember.error && (
                            <p className="text-destructive text-sm">
                              {addMember.error.message ||
                                'Failed to add team member'}
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
              disabled={addMember.isPending}
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
                    addMember.isPending ||
                    isSubmitting
                  }
                  type="submit"
                >
                  {addMember.isPending && <Spinner className="mr-2 size-4" />}
                  {addMember.isPending ? 'Adding' : 'Add Member'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
