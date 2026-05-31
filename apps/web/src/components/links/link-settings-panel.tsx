'use client';

import type { LinkDetail } from '@phase/shared';
import { useEffect, useState } from 'react';
import {
  deviceRoutingFromDetail,
  deviceRoutingToPayload,
  LinkDeviceRoutingFields,
} from '@/components/links/link-device-routing-fields';
import { LinkDomainBindingsField } from '@/components/links/link-domain-bindings-field';
import {
  LinkUtmFields,
  linkUtmFromDetail,
  linkUtmToPayload,
} from '@/components/links/link-utm-fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  useLinkDomains,
  useLinkSlugAvailable,
  useUpdateLink,
} from '@/lib/queries';

type LinkSettingsPanelProps = {
  appId: string;
  link: LinkDetail;
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function LinkSettingsPanel({ appId, link }: LinkSettingsPanelProps) {
  const updateLink = useUpdateLink(appId, link.id);
  const { data: domainsData } = useLinkDomains(appId);

  const [slug, setSlug] = useState(link.slug);
  const [destinationUrl, setDestinationUrl] = useState(link.destinationUrl);
  const [utm, setUtm] = useState(() => linkUtmFromDetail(link));
  const [device, setDevice] = useState(() => deviceRoutingFromDetail(link));
  const [domainIds, setDomainIds] = useState<string[]>(link.domainIds);
  const [expiresAt, setExpiresAt] = useState(() =>
    toDatetimeLocalValue(link.expiresAt)
  );
  const [disabled, setDisabled] = useState(Boolean(link.disabledAt));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const slugChanged = slug !== link.slug;
  const slugCheck = useLinkSlugAvailable(slug, slugChanged && slug.length >= 3);

  useEffect(() => {
    setSlug(link.slug);
    setDestinationUrl(link.destinationUrl);
    setUtm(linkUtmFromDetail(link));
    setDevice(deviceRoutingFromDetail(link));
    setDomainIds(link.domainIds);
    setExpiresAt(toDatetimeLocalValue(link.expiresAt));
    setDisabled(Boolean(link.disabledAt));
  }, [link]);

  const slugInvalid =
    slugChanged &&
    slug.length >= 3 &&
    slugCheck.data &&
    !slugCheck.data.available;

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    try {
      await updateLink.mutateAsync({
        slug: slugChanged ? slug.toLowerCase() : undefined,
        destinationUrl,
        ...linkUtmToPayload(utm),
        ...deviceRoutingToPayload(device),
        domainIds,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        disabled,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="edit-slug">
            Slug
          </label>
          <Input
            id="edit-slug"
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            value={slug}
          />
          {slugInvalid ? (
            <p className="text-destructive text-sm">Slug is taken</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="edit-destination">
            Destination URL
          </label>
          <Input
            id="edit-destination"
            onChange={(e) => setDestinationUrl(e.target.value)}
            type="url"
            value={destinationUrl}
          />
        </div>
      </div>

      <LinkUtmFields onChange={setUtm} values={utm} />
      <LinkDeviceRoutingFields onChange={setDevice} values={device} />

      <LinkDomainBindingsField
        domains={domainsData?.domains ?? []}
        onChange={setDomainIds}
        selectedIds={domainIds}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="edit-expires">
            Expires (optional)
          </label>
          <Input
            id="edit-expires"
            onChange={(e) => setExpiresAt(e.target.value)}
            type="datetime-local"
            value={expiresAt}
          />
        </div>
        <div className="flex items-end gap-3 pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              checked={disabled}
              className="size-4 rounded border"
              onChange={(e) => setDisabled(e.target.checked)}
              type="checkbox"
            />
            Disabled (returns 404)
          </label>
        </div>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {saved ? <p className="text-muted-foreground text-sm">Saved</p> : null}

      <Button
        disabled={updateLink.isPending || !destinationUrl || slugInvalid}
        onClick={() => {
          handleSave();
        }}
      >
        {updateLink.isPending ? <Spinner className="size-4" /> : 'Save changes'}
      </Button>
    </div>
  );
}
