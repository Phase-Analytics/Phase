'use client';

import { AddSquareIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { LinkDomain } from '@phase/shared';
import { useState } from 'react';
import { toast } from 'sonner';
import { LinkDnsSetupCard } from '@/components/links/link-dns-setup-card';
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

type AddDomainDialogProps = {
  appId: string;
};

export function AddDomainDialog({ appId }: AddDomainDialogProps) {
  const createDomain = useCreateLinkDomain();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'dns'>('form');
  const [addedDomain, setAddedDomain] = useState<LinkDomain | null>(null);
  const [hostname, setHostname] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep('form');
    setAddedDomain(null);
    setHostname('');
    setError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      reset();
    }
  };

  const handleSubmit = async () => {
    setError(null);
    const normalized = hostname.trim().toLowerCase();
    try {
      const domain = await createDomain.mutateAsync({
        appId,
        hostname: normalized,
      });
      setAddedDomain(domain);
      setStep('dns');
      toast.success('Domain added');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add domain');
      toast.error(err instanceof Error ? err.message : 'Failed to add domain');
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button>
          <HugeiconsIcon className="size-4" icon={AddSquareIcon} />
          Add domain
        </Button>
      </DialogTrigger>
      <DialogContent
        className={
          step === 'dns'
            ? 'max-h-[90vh] overflow-y-auto sm:max-w-3xl'
            : 'sm:max-w-md'
        }
      >
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle>Add domain</DialogTitle>
              <DialogDescription>
                Enter a hostname you control. DNS instructions come next.
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
            </div>

            {error ? <p className="text-destructive text-sm">{error}</p> : null}

            <DialogFooter>
              <Button
                disabled={createDomain.isPending || !hostname.trim()}
                onClick={() => {
                  handleSubmit();
                }}
                type="button"
              >
                {createDomain.isPending ? (
                  <Spinner className="size-4" />
                ) : (
                  'Add'
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Configure DNS</DialogTitle>
              <DialogDescription>
                Add this record, then verify from the domains table.
              </DialogDescription>
            </DialogHeader>

            {addedDomain ? (
              <LinkDnsSetupCard
                hostname={addedDomain.hostname}
                records={addedDomain.dnsRecords}
              />
            ) : null}

            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)} type="button">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
