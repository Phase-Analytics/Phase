'use client';

import { AddSquareIcon } from '@hugeicons/core-free-icons';
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
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useCreateLinkDomain } from '@/lib/queries';

const CNAME_TARGET = 'cname.phase.sh';

type AddDomainDialogProps = {
  appId: string;
};

export function AddDomainDialog({ appId }: AddDomainDialogProps) {
  const createDomain = useCreateLinkDomain();
  const [open, setOpen] = useState(false);
  const [hostname, setHostname] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    try {
      await createDomain.mutateAsync({
        appId,
        hostname: hostname.toLowerCase(),
      });
      setHostname('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add domain');
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>
          <HugeiconsIcon className="size-4" icon={AddSquareIcon} />
          Add domain
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add custom domain</DialogTitle>
          <DialogDescription>
            Add one CNAME record pointing to {CNAME_TARGET}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="hostname">
            Hostname
          </label>
          <Input
            id="hostname"
            onChange={(e) => setHostname(e.target.value)}
            placeholder="go.company.com"
            value={hostname}
          />
          <p className="text-muted-foreground text-sm">
            DNS: <code>{hostname || 'go.company.com'}</code> CNAME{' '}
            <code>{CNAME_TARGET}</code>
          </p>
        </div>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        <DialogFooter>
          <Button
            disabled={createDomain.isPending || !hostname}
            onClick={() => {
              handleSubmit();
            }}
          >
            {createDomain.isPending ? <Spinner className="size-4" /> : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
