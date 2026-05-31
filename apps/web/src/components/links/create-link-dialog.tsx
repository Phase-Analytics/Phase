'use client';

import { AddSquareIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DatePicker } from '@/components/date-picker';
import { BuilderDropdown } from '@/components/explore/explore-filter-clause';
import {
  deviceRoutingToPayload,
  emptyDeviceRoutingValues,
  hasDeviceRoutingValues,
  LinkDeviceRoutingFields,
} from '@/components/links/link-device-routing-fields';
import { LinkFeatureSection } from '@/components/links/link-feature-section';
import {
  emptyLinkUtmValues,
  hasLinkUtmValues,
  LinkUtmFields,
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
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  useCreateLink,
  useLinkDomains,
  useLinkSlugAvailable,
} from '@/lib/queries';

const PHASE_HOST_VALUE = 'phase';

type CreateLinkDialogProps = {
  appId: string;
};

export function CreateLinkDialog({ appId }: CreateLinkDialogProps) {
  const router = useRouter();
  const createLink = useCreateLink();
  const { data: domainsData } = useLinkDomains(appId);
  const [open, setOpen] = useState(false);
  const [hostValue, setHostValue] = useState(PHASE_HOST_VALUE);
  const [slug, setSlug] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [utmEnabled, setUtmEnabled] = useState(false);
  const [utm, setUtm] = useState(emptyLinkUtmValues);
  const [deviceEnabled, setDeviceEnabled] = useState(false);
  const [device, setDevice] = useState(emptyDeviceRoutingValues);
  const [expiresAt, setExpiresAt] = useState<Date | undefined>();
  const [error, setError] = useState<string | null>(null);
  const deviceAutofillDone = useRef(false);

  const verifiedDomains = useMemo(
    () => domainsData?.domains.filter((d) => d.status === 'verified') ?? [],
    [domainsData?.domains]
  );

  const hostOptions = useMemo(
    () => [
      { value: PHASE_HOST_VALUE, label: 'phase.sh' },
      ...verifiedDomains.map((domain) => ({
        value: domain.id,
        label: domain.hostname,
      })),
    ],
    [verifiedDomains]
  );

  const slugCheck = useLinkSlugAvailable(slug, open && slug.length >= 3);

  const slugPrefix =
    hostValue === PHASE_HOST_VALUE ? '/l/' : '/';

  useEffect(() => {
    if (!open) {
      setHostValue(PHASE_HOST_VALUE);
      setSlug('');
      setDestinationUrl('');
      setUtmEnabled(false);
      setUtm(emptyLinkUtmValues());
      setDeviceEnabled(false);
      setDevice(emptyDeviceRoutingValues());
      setExpiresAt(undefined);
      setError(null);
      deviceAutofillDone.current = false;
    }
  }, [open]);

  const handleDeviceEnabledChange = (enabled: boolean) => {
    setDeviceEnabled(enabled);

    if (!enabled || deviceAutofillDone.current || !destinationUrl) {
      return;
    }

    const isEmpty = !hasDeviceRoutingValues(device);
    if (isEmpty) {
      setDevice({
        deviceIosUrl: destinationUrl,
        deviceAndroidUrl: destinationUrl,
        deviceOthersUrl: destinationUrl,
      });
    }

    deviceAutofillDone.current = true;
  };

  const handleSubmit = async () => {
    setError(null);
    try {
      const domainIds =
        hostValue === PHASE_HOST_VALUE ? [] : [hostValue];

      const created = await createLink.mutateAsync({
        appId,
        slug: slug.toLowerCase(),
        destinationUrl,
        ...(utmEnabled ? linkUtmToPayload(utm) : linkUtmToPayload(emptyLinkUtmValues())),
        ...(deviceEnabled
          ? deviceRoutingToPayload(device)
          : deviceRoutingToPayload(emptyDeviceRoutingValues())),
        domainIds,
        expiresAt: expiresAt
          ? new Date(
              expiresAt.getFullYear(),
              expiresAt.getMonth(),
              expiresAt.getDate(),
              23,
              59,
              59,
              999
            ).toISOString()
          : null,
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
        </DialogHeader>

        <div className="space-y-6">
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

          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="slug">
              Link
            </label>
            <div className="flex gap-2">
              <BuilderDropdown
                className="h-9 w-[min(42%,11rem)] shrink-0"
                onValueChange={setHostValue}
                options={hostOptions}
                value={hostValue}
              />
              <div className="flex min-w-0 flex-1 items-center gap-0">
                <span className="flex h-9 shrink-0 items-center rounded-l-md border border-r-0 bg-muted/50 px-2 font-mono text-muted-foreground text-xs">
                  {slugPrefix}
                </span>
                <Input
                  className="rounded-l-none"
                  id="slug"
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="launch-2026"
                  value={slug}
                />
              </div>
            </div>
            {slugInvalid ? (
              <p className="text-destructive text-sm">Link is taken</p>
            ) : null}
          </div>

          <LinkFeatureSection
            enabled={deviceEnabled}
            onEnabledChange={handleDeviceEnabledChange}
            title="Device routing"
          >
            <LinkDeviceRoutingFields onChange={setDevice} values={device} />
          </LinkFeatureSection>

          <LinkFeatureSection
            enabled={utmEnabled}
            onEnabledChange={setUtmEnabled}
            title="UTM parameters"
          >
            <LinkUtmFields onChange={setUtm} values={utm} />
          </LinkFeatureSection>

          <div className="space-y-2">
            <label className="font-medium text-sm">Expires</label>
            <DatePicker
              onChange={setExpiresAt}
              placeholder="No expiry"
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
