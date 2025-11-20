'use client';

import { AddSquareIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { type FormEvent, useState } from 'react';
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
import { useCreateApp } from '@/lib/queries';

type CreateAppDialogProps = {
  children?: React.ReactNode;
  onSuccess?: (appId: string) => void;
};

const APP_NAME_MIN_LENGTH = 3;
const APP_NAME_MAX_LENGTH = 14;
const APP_NAME_REGEX = /^[a-zA-Z0-9\s-]+$/;

export function CreateAppDialog({ children, onSuccess }: CreateAppDialogProps) {
  const [open, setOpen] = useState(false);
  const [appName, setAppName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createApp = useCreateApp();

  const validateAppName = (name: string): string | null => {
    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      return 'Application name is required';
    }

    if (trimmedName.length < APP_NAME_MIN_LENGTH) {
      return `Application name must be at least ${APP_NAME_MIN_LENGTH} characters`;
    }

    if (trimmedName.length > APP_NAME_MAX_LENGTH) {
      return `Application name must be at most ${APP_NAME_MAX_LENGTH} characters`;
    }

    if (!APP_NAME_REGEX.test(trimmedName)) {
      return 'Application name can only contain letters, numbers, spaces, and hyphens';
    }

    return null;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateAppName(appName);
    if (validationError) {
      setError(validationError);
      return;
    }

    createApp.mutate(
      { name: appName.trim() },
      {
        onSuccess: (data) => {
          setOpen(false);
          setAppName('');
          setError(null);
          onSuccess?.(data.id);
        },
        onError: (err) => {
          setError(err.message || 'Failed to create application');
        },
      }
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setAppName('');
      setError(null);
      createApp.reset();
    }
  };

  const handleNameChange = (value: string) => {
    setAppName(value);
    if (error) {
      setError(null);
    }
  };

  const isValid = validateAppName(appName) === null;

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
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Application</DialogTitle>
            <DialogDescription>
              Give your application a name to get started with analytics.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Input
              aria-invalid={!!error}
              autoComplete="off"
              disabled={createApp.isPending}
              maxLength={APP_NAME_MAX_LENGTH}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="Enter application name"
              type="text"
              value={appName}
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
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
            <Button disabled={!isValid || createApp.isPending} type="submit">
              {createApp.isPending && <Spinner className="mr-2 size-4" />}
              {createApp.isPending ? 'Creating' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
