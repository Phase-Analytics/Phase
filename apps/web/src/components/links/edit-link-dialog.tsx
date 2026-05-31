'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  deviceRoutingToPayload,
  emptyDeviceRoutingValues,
} from '@/components/links/link-device-routing-fields';
import { LinkFormFields } from '@/components/links/link-form-fields';
import {
  emptyLinkFormState,
  expiresAtToIso,
  linkDetailToFormState,
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
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  useLink,
  useLinkDomains,
  useLinkSlugAvailable,
  useUpdateLink,
} from '@/lib/queries';

type EditLinkDialogProps = {
  appId: string;
  linkId: string;
  children: React.ReactNode;
};

export function EditLinkDialog({
  appId,
  linkId,
  children,
}: EditLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyLinkFormState);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: link, isPending: linkLoading } = useLink(
    appId,
    open ? linkId : ''
  );
  const { data: domainsData } = useLinkDomains(appId);
  const updateLink = useUpdateLink(appId, linkId);

  const verifiedDomains = useMemo(
    () => domainsData?.domains.filter((d) => d.status === 'verified') ?? [],
    [domainsData?.domains]
  );

  const slugChanged = link ? form.slug !== link.slug : false;
  const slugCheck = useLinkSlugAvailable(
    form.slug,
    open && slugChanged && form.slug.length >= 3
  );

  const slugInvalid =
    slugChanged &&
    form.slug.length >= 3 &&
    slugCheck.data &&
    !slugCheck.data.available;

  useEffect(() => {
    if (!open) {
      setForm(emptyLinkFormState());
      setInitialized(false);
      setError(null);
      updateLink.reset();
    }
  }, [open, updateLink.reset]);

  useEffect(() => {
    if (!(open && link) || initialized) {
      return;
    }

    setForm(linkDetailToFormState(link));
    setInitialized(true);
  }, [open, link, initialized]);

  const handleSubmit = async () => {
    setError(null);

    try {
      await updateLink.mutateAsync({
        slug: slugChanged ? form.slug.toLowerCase() : undefined,
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
      toast.success('Link updated');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update link');
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit link</DialogTitle>
        </DialogHeader>

        {linkLoading || !initialized ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <LinkFormFields
            form={form}
            idPrefix="edit-link"
            onChange={setForm}
            originalSlug={link?.slug}
            slugError={slugInvalid ? 'Link is taken' : null}
            verifiedDomains={verifiedDomains}
          />
        )}

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        <DialogFooter>
          <Button
            disabled={
              updateLink.isPending ||
              linkLoading ||
              !initialized ||
              !form.slug ||
              !form.destinationUrl ||
              slugInvalid
            }
            onClick={() => {
              handleSubmit();
            }}
            type="button"
          >
            {updateLink.isPending ? <Spinner className="size-4" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
