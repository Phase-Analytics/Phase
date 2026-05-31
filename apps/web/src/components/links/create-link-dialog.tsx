'use client';

import { AddSquareIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  deviceRoutingToPayload,
  emptyDeviceRoutingValues,
} from '@/components/links/link-device-routing-fields';
import { LinkFormFields } from '@/components/links/link-form-fields';
import {
  emptyLinkFormState,
  expiresAtToIso,
  PHASE_HOST_VALUE,
} from '@/components/links/link-form-utils';
import {
  emptyLinkUtmValues,
  linkUtmToPayload,
} from '@/components/links/link-utm-fields';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import {
  useCreateLink,
  useLinkDomains,
  useLinkSlugAvailable,
} from '@/lib/queries';

type CreateLinkDialogProps = {
  appId: string;
};

export function CreateLinkDialog({ appId }: CreateLinkDialogProps) {
  const router = useRouter();
  const createLink = useCreateLink();
  const { data: domainsData } = useLinkDomains(appId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyLinkFormState);
  const [error, setError] = useState<string | null>(null);

  const verifiedDomains = useMemo(
    () => domainsData?.domains.filter((d) => d.status === 'verified') ?? [],
    [domainsData?.domains]
  );

  const slugCheck = useLinkSlugAvailable(
    form.slug,
    open && form.slug.length >= 3
  );

  const slugInvalid =
    form.slug.length >= 3 && slugCheck.data && !slugCheck.data.available;

  useEffect(() => {
    if (!open) {
      setForm(emptyLinkFormState());
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    setError(null);

    try {
      const created = await createLink.mutateAsync({
        appId,
        slug: form.slug.toLowerCase(),
        destinationUrl: form.destinationUrl,
        ...(form.utmEnabled
          ? linkUtmToPayload(form.utm)
          : linkUtmToPayload(emptyLinkUtmValues())),
        ...(form.deviceEnabled
          ? deviceRoutingToPayload(form.device)
          : deviceRoutingToPayload(emptyDeviceRoutingValues())),
        domainIds: form.hostValue === PHASE_HOST_VALUE ? [] : [form.hostValue],
        expiresAt: expiresAtToIso(form.expiresAt),
        disabled: form.disabled,
      });
      setOpen(false);
      router.push(`/dashboard/links/${created.id}?app=${appId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create link');
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>
          <HugeiconsIcon className="size-4" icon={AddSquareIcon} />
          New link
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create link</DialogTitle>
        </DialogHeader>

        <LinkFormFields
          form={form}
          idPrefix="create-link"
          onChange={setForm}
          slugError={slugInvalid ? 'Link is taken' : null}
          verifiedDomains={verifiedDomains}
        />

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        <DialogFooter>
          <Button
            disabled={
              createLink.isPending ||
              !form.slug ||
              !form.destinationUrl ||
              slugInvalid
            }
            onClick={() => {
              handleSubmit();
            }}
            type="button"
          >
            {createLink.isPending ? <Spinner className="size-4" /> : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
