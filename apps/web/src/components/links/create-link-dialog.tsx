'use client';

import { AddSquareIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  deviceRoutingToPayload,
  emptyDeviceRoutingValues,
  LinkDeviceRoutingFields,
} from '@/components/links/link-device-routing-fields';
import { LinkDomainBindingsField } from '@/components/links/link-domain-bindings-field';
import {
  emptyLinkUtmValues,
  LinkUtmFields,
  linkUtmToPayload,
} from '@/components/links/link-utm-fields';
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
  const [slug, setSlug] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [utm, setUtm] = useState(emptyLinkUtmValues);
  const [device, setDevice] = useState(emptyDeviceRoutingValues);
  const [domainIds, setDomainIds] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const slugCheck = useLinkSlugAvailable(slug, open && slug.length >= 3);

  useEffect(() => {
    if (!open) {
      setSlug('');
      setDestinationUrl('');
      setUtm(emptyLinkUtmValues());
      setDevice(emptyDeviceRoutingValues());
      setDomainIds([]);
      setExpiresAt('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    setError(null);
    try {
      const created = await createLink.mutateAsync({
        appId,
        slug: slug.toLowerCase(),
        destinationUrl,
        ...linkUtmToPayload(utm),
        ...deviceRoutingToPayload(device),
        domainIds,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      setOpen(false);
      router.push(`/dashboard/links/${created.id}?app=${appId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create link');
    }
  };

  const slugInvalid =
    slug.length >= 3 && slugCheck.data && !slugCheck.data.available;

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
          <DialogDescription>
            Short URL: phase.sh/l/{slug || 'your-slug'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="slug">
              Slug
            </label>
            <Input
              id="slug"
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="launch-2026"
              value={slug}
            />
            {slugInvalid ? (
              <p className="text-destructive text-sm">Slug is taken</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="destination">
              Destination URL
            </label>
            <Input
              id="destination"
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://example.com/page"
              type="url"
              value={destinationUrl}
            />
          </div>

          <LinkUtmFields onChange={setUtm} values={utm} />
          <LinkDeviceRoutingFields onChange={setDevice} values={device} />

          <LinkDomainBindingsField
            domains={domainsData?.domains ?? []}
            onChange={setDomainIds}
            selectedIds={domainIds}
          />

          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="expires">
              Expires (optional)
            </label>
            <Input
              id="expires"
              onChange={(e) => setExpiresAt(e.target.value)}
              type="datetime-local"
              value={expiresAt}
            />
          </div>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            disabled={
              createLink.isPending || !slug || !destinationUrl || slugInvalid
            }
            onClick={() => {
              handleSubmit();
            }}
          >
            {createLink.isPending ? <Spinner className="size-4" /> : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
