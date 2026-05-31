'use client';

import {
  Clock04Icon,
  Link01Icon,
  Link05Icon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMemo, useRef } from 'react';
import { DatePicker } from '@/components/date-picker';
import { BuilderDropdown } from '@/components/explore/explore-filter-clause';
import {
  hasDeviceRoutingValues,
  LinkDeviceRoutingFields,
} from '@/components/links/link-device-routing-fields';
import { LinkFeatureSection } from '@/components/links/link-feature-section';
import type { LinkFormState } from '@/components/links/link-form-utils';
import { PHASE_HOST_VALUE } from '@/components/links/link-form-utils';
import {
  getLinkUtmDisplayEntries,
  LinkUtmFields,
} from '@/components/links/link-utm-fields';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { formatUrlWithoutProtocol } from '@/lib/link-urls';

type LinkFormFieldsProps = {
  form: LinkFormState;
  onChange: (form: LinkFormState) => void;
  verifiedDomains: Array<{ id: string; hostname: string }>;
  slugError?: string | null;
  originalSlug?: string;
  idPrefix?: string;
};

function FeatureSummary({
  items,
}: {
  items: Array<{ label: string; value: string; icon?: IconSvgElement }>;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <dl className="space-y-1">
        {items.map((item) => (
          <div className="flex gap-2 text-sm" key={item.label}>
            <dt className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
              {item.icon ? (
                <HugeiconsIcon className="size-3.5" icon={item.icon} />
              ) : null}
              {item.label}
            </dt>
            <dd className="min-w-0 break-all">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function LinkFormFields({
  form,
  onChange,
  verifiedDomains,
  slugError,
  originalSlug,
  idPrefix = 'link',
}: LinkFormFieldsProps) {
  const deviceAutofillDone = useRef(false);

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

  const slugPrefix = form.hostValue === PHASE_HOST_VALUE ? '/l/' : '/';

  const patch = (partial: Partial<LinkFormState>) => {
    onChange({ ...form, ...partial });
  };

  const handleDeviceEnabledChange = (enabled: boolean) => {
    patch({ deviceEnabled: enabled });

    if (!enabled || deviceAutofillDone.current || !form.destinationUrl) {
      return;
    }

    if (!hasDeviceRoutingValues(form.device)) {
      patch({
        deviceEnabled: enabled,
        device: {
          deviceIosUrl: form.destinationUrl,
          deviceAndroidUrl: form.destinationUrl,
          deviceOthersUrl: form.destinationUrl,
        },
      });
    }

    deviceAutofillDone.current = true;
  };

  const utmSummary = getLinkUtmDisplayEntries(form.utm).map((entry) => ({
    label: entry.label,
    value: entry.value,
    icon: entry.icon,
  }));

  const deviceSummary = [
    { label: 'iOS', value: form.device.deviceIosUrl },
    { label: 'Android', value: form.device.deviceAndroidUrl },
    { label: 'Others', value: form.device.deviceOthersUrl },
  ]
    .filter((entry) => entry.value)
    .map((entry) => ({
      label: entry.label,
      value: formatUrlWithoutProtocol(entry.value),
    }));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label
          className="flex items-center gap-1.5 font-medium text-sm"
          htmlFor={`${idPrefix}-destination`}
        >
          <HugeiconsIcon
            className="size-4 shrink-0 text-muted-foreground"
            icon={Link01Icon}
          />
          Destination URL
        </label>
        <Input
          id={`${idPrefix}-destination`}
          onChange={(e) => patch({ destinationUrl: e.target.value })}
          placeholder="example.com/page"
          type="text"
          value={form.destinationUrl}
        />
      </div>

      <div className="space-y-2">
        <label
          className="flex items-center gap-1.5 font-medium text-sm"
          htmlFor={`${idPrefix}-slug`}
        >
          <HugeiconsIcon
            className="size-4 shrink-0 text-muted-foreground"
            icon={Link05Icon}
          />
          Link
        </label>
        <div className="flex gap-2">
          <BuilderDropdown
            className="h-9 w-[min(42%,11rem)] shrink-0"
            onValueChange={(hostValue) => patch({ hostValue })}
            options={hostOptions}
            value={form.hostValue}
          />
          <div className="flex min-w-0 flex-1 items-center gap-0">
            <span className="flex h-9 shrink-0 items-center rounded-l-md border border-r-0 bg-muted/50 px-2 font-mono text-muted-foreground text-xs">
              {slugPrefix}
            </span>
            <Input
              className="rounded-l-none"
              id={`${idPrefix}-slug`}
              onChange={(e) => patch({ slug: e.target.value.toLowerCase() })}
              placeholder="launch-2026"
              value={form.slug}
            />
          </div>
        </div>
        {slugError ? (
          <p className="text-destructive text-sm">{slugError}</p>
        ) : null}
        {originalSlug && originalSlug !== form.slug ? (
          <p className="text-muted-foreground text-xs">
            Current slug: {originalSlug}
          </p>
        ) : null}
      </div>

      <LinkFeatureSection
        enabled={form.deviceEnabled}
        onEnabledChange={handleDeviceEnabledChange}
        title="Device routing"
      >
        <LinkDeviceRoutingFields
          onChange={(device) => patch({ device })}
          values={form.device}
        />
      </LinkFeatureSection>
      {!form.deviceEnabled && deviceSummary.length > 0 ? (
        <FeatureSummary items={deviceSummary} />
      ) : null}

      <LinkFeatureSection
        enabled={form.utmEnabled}
        onEnabledChange={(utmEnabled) => patch({ utmEnabled })}
        title="UTM parameters"
      >
        <LinkUtmFields onChange={(utm) => patch({ utm })} values={form.utm} />
      </LinkFeatureSection>
      {!form.utmEnabled && utmSummary.length > 0 ? (
        <FeatureSummary items={utmSummary} />
      ) : null}

      <div className="space-y-4 rounded-md border p-4">
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 font-medium text-sm">
            <HugeiconsIcon
              className="size-4 shrink-0 text-muted-foreground"
              icon={Clock04Icon}
            />
            Expires
          </label>
          <DatePicker
            onChange={(expiresAt) => patch({ expiresAt })}
            placeholder="No expiry"
            value={form.expiresAt}
          />
          {form.expiresAt ? null : (
            <p className="text-muted-foreground text-xs">No expiry set</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="font-medium text-sm">Disabled</p>
            <p className="text-muted-foreground text-xs">
              Disabled links return 404
            </p>
          </div>
          <Switch
            checked={form.disabled}
            onCheckedChange={(disabled) => patch({ disabled })}
          />
        </div>
      </div>
    </div>
  );
}
