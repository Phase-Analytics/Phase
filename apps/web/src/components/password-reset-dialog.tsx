'use client';

import { MailIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
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
import { forgotPassword } from '@/lib/auth';

type PasswordResetDialogProps = {
  children?: React.ReactNode;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PasswordResetDialog({ children }: PasswordResetDialogProps) {
  const [open, setOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const result = await forgotPassword(
        email,
        `${window.location.origin}/auth`
      );
      return result;
    },
    onSuccess: () => {
      setSuccessMessage('Password reset email sent. Check your inbox.');
      form.reset();
    },
  });

  const form = useForm({
    defaultValues: {
      email: '',
    },
    onSubmit: ({ value }) => {
      resetPasswordMutation.mutate(value.email.trim());
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
      resetPasswordMutation.reset();
      setSuccessMessage(null);
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        {children || (
          <Button type="button" variant="link">
            Forgot password?
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
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your
              password.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {successMessage ? (
              <div className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-4 text-success dark:border-green-800 dark:bg-green-950">
                <HugeiconsIcon
                  className="mt-0.5 size-5 flex-shrink-0 text-success"
                  icon={MailIcon}
                />
                <p className="text-sm">{successMessage}</p>
              </div>
            ) : (
              <form.Subscribe selector={(state) => state.submissionAttempts}>
                {(submissionAttempts) => (
                  <form.Field
                    name="email"
                    validators={{
                      onChange: ({ value }) => {
                        const trimmedValue = value.trim();

                        if (trimmedValue.length === 0) {
                          return 'Email address is required';
                        }

                        if (!EMAIL_PATTERN.test(trimmedValue)) {
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
                          <Input
                            aria-invalid={showErrors}
                            autoComplete="email"
                            disabled={resetPasswordMutation.isPending}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            placeholder="Enter your email address"
                            type="email"
                            value={field.state.value}
                          />
                          <AutoHeight
                            deps={[
                              showErrors,
                              resetPasswordMutation.error?.message,
                            ]}
                          >
                            {showErrors && (
                              <p className="text-destructive text-sm">
                                {field.state.meta.errors[0]}
                              </p>
                            )}
                            {resetPasswordMutation.error && (
                              <p className="text-destructive text-sm">
                                {resetPasswordMutation.error.message ||
                                  'Failed to send reset email'}
                              </p>
                            )}
                          </AutoHeight>
                        </div>
                      );
                    }}
                  </form.Field>
                )}
              </form.Subscribe>
            )}
          </div>
          <DialogFooter>
            {successMessage ? (
              <Button onClick={() => setOpen(false)} type="button">
                Close
              </Button>
            ) : (
              <>
                <Button
                  disabled={resetPasswordMutation.isPending}
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
                        resetPasswordMutation.isPending ||
                        isSubmitting
                      }
                      type="submit"
                    >
                      {resetPasswordMutation.isPending && (
                        <Spinner className="mr-2 size-4" />
                      )}
                      {resetPasswordMutation.isPending
                        ? 'Sending'
                        : 'Send Reset Link'}
                    </Button>
                  )}
                </form.Subscribe>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
