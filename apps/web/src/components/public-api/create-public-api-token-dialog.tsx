'use client';

import { AddSquareIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMemo, useState } from 'react';
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
import { Spinner } from '@/components/ui/spinner';
import type { CreatePublicApiTokenResponse } from '@/lib/api/types';
import { useCreatePublicApiToken } from '@/lib/queries';

type ExpirationPreset = '1w' | '1m' | '1y' | 'never';

const expirationOptions: Array<{ value: ExpirationPreset; label: string }> = [
  { value: '1w', label: '1 week' },
  { value: '1m', label: '1 month' },
  { value: '1y', label: '1 year' },
  { value: 'never', label: 'Never' },
];

type CreatePublicApiTokenDialogProps = {
  appId: string;
  disabled?: boolean;
  children?: React.ReactNode;
};

function getExpiryIso(preset: ExpirationPreset): string | null {
  if (preset === 'never') {
    return null;
  }

  const now = new Date();

  if (preset === '1w') {
    now.setDate(now.getDate() + 7);
    return now.toISOString();
  }

  if (preset === '1m') {
    now.setMonth(now.getMonth() + 1);
    return now.toISOString();
  }

  now.setFullYear(now.getFullYear() + 1);
  return now.toISOString();
}

export function CreatePublicApiTokenDialog({
  appId,
  disabled,
  children,
}: CreatePublicApiTokenDialogProps) {
  const createToken = useCreatePublicApiToken();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [expirationPreset, setExpirationPreset] =
    useState<ExpirationPreset>('1m');
  const [createdToken, setCreatedToken] =
    useState<CreatePublicApiTokenResponse | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const isSubmitDisabled = createToken.isPending || name.trim().length === 0;

  const expiresAt = useMemo(
    () => getExpiryIso(expirationPreset),
    [expirationPreset]
  );

  const resetState = () => {
    setName('');
    setExpirationPreset('1m');
    setCreatedToken(null);
    setLocalError(null);
    createToken.reset();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetState();
    }
  };

  const handleCreate = () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setLocalError('Key name is required');
      return;
    }

    setLocalError(null);

    createToken.mutate(
      {
        appId,
        data: {
          name: trimmedName,
          expiresAt,
        },
      },
      {
        onSuccess: (data) => {
          setCreatedToken(data);
        },
      }
    );
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        {children || (
          <Button disabled={disabled} type="button">
            <HugeiconsIcon className="mr-2 size-4" icon={AddSquareIcon} />
            Create Key
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        {createdToken ? (
          <>
            <DialogHeader>
              <DialogTitle>Copy your key now</DialogTitle>
              <DialogDescription>
                This secret is only shown once. Store it securely before closing
                this dialog.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
                <p className="font-medium text-sm">One-time reveal</p>
                <p className="mt-1 text-muted-foreground text-sm">
                  You will not be able to view this key again after closing.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-medium text-sm">API key</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex-1 overflow-hidden rounded-lg border bg-muted/40 px-3 py-2 font-mono text-sm">
                    <div className="overflow-x-auto whitespace-nowrap">
                      {createdToken.token}
                    </div>
                  </div>
                  <CopyButton
                    content={createdToken.token}
                    size="sm"
                    variant="outline"
                  />
                </div>
              </div>

              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="font-medium text-sm">App ID</p>
                <p className="mt-1 font-mono text-muted-foreground text-sm">
                  {appId}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setOpen(false)} type="button">
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Generate a read-only key for external dashboards, scripts, and
                integrations.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label
                  className="font-medium text-sm"
                  htmlFor="public-api-token-name"
                >
                  Key name
                </label>
                <Input
                  id="public-api-token-name"
                  maxLength={100}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Production"
                  value={name}
                />
              </div>

              <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                <div>
                  <p className="font-medium text-sm">Expiration</p>
                  <p className="text-muted-foreground text-sm">
                    Choose how long this key should remain valid.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {expirationOptions.map((option) => {
                    const isActive = expirationPreset === option.value;

                    return (
                      <Button
                        className="justify-start"
                        key={option.value}
                        onClick={() => setExpirationPreset(option.value)}
                        type="button"
                        variant={isActive ? 'default' : 'outline'}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {(localError || createToken.error) && (
                <p className="text-destructive text-sm">
                  {localError || createToken.error?.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                disabled={createToken.isPending}
                onClick={() => setOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                className="relative"
                disabled={isSubmitDisabled}
                onClick={handleCreate}
                type="button"
              >
                {createToken.isPending && (
                  <Spinner className="absolute inset-0 m-auto size-4" />
                )}
                <span className={createToken.isPending ? 'invisible' : ''}>
                  Create key
                </span>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
