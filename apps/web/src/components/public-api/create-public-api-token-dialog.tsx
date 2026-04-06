'use client';

import { AddSquareIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import type {
  CreatePublicApiTokenResponse,
  PublicApiScope,
} from '@/lib/api/types';
import { useCreatePublicApiToken } from '@/lib/queries';
import { PublicApiScopeBadges } from './public-api-scope-badges';

const availableScopes: Array<{ value: PublicApiScope; label: string }> = [
  {
    value: 'reports:read',
    label: 'Read the current curated report surface and capability metadata',
  },
];

type CreatePublicApiTokenDialogProps = {
  appId: string;
  disabled?: boolean;
  onCreated?: (token: CreatePublicApiTokenResponse) => void;
  children?: React.ReactNode;
};

export function CreatePublicApiTokenDialog({
  appId,
  disabled,
  onCreated,
  children,
}: CreatePublicApiTokenDialogProps) {
  const createToken = useCreatePublicApiToken();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<PublicApiScope[]>([
    'reports:read',
  ]);
  const [createdToken, setCreatedToken] =
    useState<CreatePublicApiTokenResponse | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const isSubmitDisabled =
    createToken.isPending ||
    name.trim().length === 0 ||
    selectedScopes.length === 0;

  const expiryIso = useMemo(() => {
    if (!expiresAt) {
      return null;
    }

    const parsed = new Date(expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toISOString();
  }, [expiresAt]);

  const resetState = () => {
    setName('');
    setExpiresAt('');
    setSelectedScopes(['reports:read']);
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

  const toggleScope = (scope: PublicApiScope, checked: boolean) => {
    setSelectedScopes((current) => {
      if (checked) {
        return current.includes(scope) ? current : [...current, scope];
      }

      return current.filter((entry) => entry !== scope);
    });
  };

  const handleCreate = () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setLocalError('Token name is required');
      return;
    }

    if (selectedScopes.length === 0) {
      setLocalError('Select at least one scope');
      return;
    }

    if (expiresAt && !expiryIso) {
      setLocalError('Expiration must be a valid date and time');
      return;
    }

    setLocalError(null);

    createToken.mutate(
      {
        appId,
        data: {
          name: trimmedName,
          scopes: selectedScopes,
          expiresAt: expiryIso,
        },
      },
      {
        onSuccess: (data) => {
          setCreatedToken(data);
          onCreated?.(data);
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
            Create Token
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        {createdToken ? (
          <>
            <DialogHeader>
              <DialogTitle>Copy your token now</DialogTitle>
              <DialogDescription>
                This secret is only shown once. Store it securely before closing
                this dialog.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
                <p className="font-medium text-sm">One-time reveal</p>
                <p className="mt-1 text-muted-foreground text-sm">
                  You will not be able to view this token again after closing.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-medium text-sm">Public API token</p>
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

              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                <p className="font-medium text-sm">Token details</p>
                <p className="text-muted-foreground text-sm">
                  {createdToken.name}
                </p>
                <PublicApiScopeBadges scopes={createdToken.scopes} />
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
              <DialogTitle>Create Public API token</DialogTitle>
              <DialogDescription>
                Generate a read-only token for external dashboards, scripts, and
                integrations.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label
                  className="font-medium text-sm"
                  htmlFor="public-api-token-name"
                >
                  Token name
                </label>
                <Input
                  id="public-api-token-name"
                  maxLength={100}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Production reporting"
                  value={name}
                />
              </div>

              <div className="space-y-2">
                <label
                  className="font-medium text-sm"
                  htmlFor="public-api-token-expiry"
                >
                  Expiration (optional)
                </label>
                <Input
                  id="public-api-token-expiry"
                  onChange={(event) => setExpiresAt(event.target.value)}
                  type="datetime-local"
                  value={expiresAt}
                />
              </div>

              <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                <div>
                  <p className="font-medium text-sm">Scopes</p>
                  <p className="text-muted-foreground text-sm">
                    The current external MVP focuses on curated reports and the
                    capabilities endpoint. Additional scope groups will appear
                    when more public surfaces ship.
                  </p>
                </div>
                <div className="space-y-3">
                  {availableScopes.map((scope) => {
                    const checked = selectedScopes.includes(scope.value);
                    return (
                      <label
                        className="flex items-start gap-3"
                        htmlFor={`scope-${scope.value}`}
                        key={scope.value}
                      >
                        <Checkbox
                          checked={checked}
                          id={`scope-${scope.value}`}
                          onCheckedChange={(value) =>
                            toggleScope(scope.value, value === true)
                          }
                        />
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{scope.value}</p>
                          <p className="text-muted-foreground text-sm">
                            {scope.label}
                          </p>
                        </div>
                      </label>
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
                  Create token
                </span>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
