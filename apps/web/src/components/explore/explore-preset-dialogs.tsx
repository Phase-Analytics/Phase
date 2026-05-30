'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

type PresetNameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  defaultName: string;
  submitLabel: string;
  isPending: boolean;
  error: string | null;
  onSubmit: (name: string) => Promise<void>;
};

export function PresetNameDialog({
  open,
  onOpenChange,
  title,
  description,
  defaultName,
  submitLabel,
  isPending,
  error,
  onSubmit,
}: PresetNameDialogProps) {
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (open) {
      setName(defaultName);
    }
  }, [open, defaultName]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  const trimmed = name.trim();

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!trimmed) {
              return;
            }
            await onSubmit(trimmed);
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              disabled={isPending}
              onChange={(event) => setName(event.target.value)}
              placeholder="Preset name"
              value={name}
            />
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="relative"
              disabled={!trimmed || isPending}
              type="submit"
            >
              {isPending ? (
                <Spinner className="absolute inset-0 m-auto size-4" />
              ) : null}
              <span className={isPending ? 'invisible' : ''}>
                {submitLabel}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
