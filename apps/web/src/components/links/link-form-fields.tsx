'use client';

import {
  Clock04Icon,
  Link01Icon,
  Link05Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useMemo } from 'react';
import { DatePicker } from '@/components/date-picker';
import { BuilderDropdown } from '@/components/explore/explore-filter-clause';
import { LinkDeviceRoutingFields } from '@/components/links/link-device-routing-fields';
import type { LinkFormState } from '@/components/links/link-form-utils';
import { PHASE_HOST_VALUE } from '@/components/links/link-form-utils';
import { LinkOgFields } from '@/components/links/link-og-fields';
import { LinkOgPreviewCard } from '@/components/links/link-og-preview-card';
import { LinkUtmFields } from '@/components/links/link-utm-fields';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type LinkFormFieldsProps = {
  appId: string;
  linkId?: string;
  form: LinkFormState;
  onChange: (form: LinkFormState) => void;
  verifiedDomains: Array<{ id: string; hostname: string }>;
  slugError?: string | null;
  originalSlug?: string;
  idPrefix?: string;
};

export function LinkFormFields({
  appId,
  linkId,
  form,
  onChange,
  verifiedDomains,
  slugError,
  originalSlug,
  idPrefix = 'link',
}: LinkFormFieldsProps) {
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

  const previewLink = useMemo(
    () => ({
      destinationUrl: form.destinationUrl,
      slug: form.slug,
      ogTitle: form.og.title || null,
      ogDescription: form.og.description || null,
      ogImageUrl: form.ogImageUrl,
      updatedAt: form.ogImageCacheKey ?? new Date().toISOString(),
    }),
    [
      form.destinationUrl,
      form.slug,
      form.og.title,
      form.og.description,
      form.ogImageUrl,
      form.ogImageCacheKey,
    ]
  );

  const pendingPreviewUrl = useMemo(() => {
    if (!form.ogPendingFile) {
      return;
    }
    return URL.createObjectURL(form.ogPendingFile);
  }, [form.ogPendingFile]);

  useEffect(
    () => () => {
      if (pendingPreviewUrl) {
        URL.revokeObjectURL(pendingPreviewUrl);
      }
    },
    [pendingPreviewUrl]
  );

  return (
    <Tabs defaultValue="overview">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
        <TabsTrigger value="routing">Routing</TabsTrigger>
        <TabsTrigger value="utm">UTM</TabsTrigger>
      </TabsList>

      <TabsContent className="space-y-4" value="overview">
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor={`${idPrefix}-name`}>
            Name
          </label>
          <Input
            id={`${idPrefix}-name`}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Product launch"
            type="text"
            value={form.name}
          />
        </div>

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

        <div className="space-y-2">
          <p className="flex items-center gap-1.5 font-medium text-sm">
            <HugeiconsIcon
              className="size-4 shrink-0 text-muted-foreground"
              icon={Clock04Icon}
            />
            Expires
          </p>
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
      </TabsContent>

      <TabsContent className="space-y-4" value="preview">
        <LinkOgPreviewCard
          imageOverride={pendingPreviewUrl}
          link={previewLink}
          variant="inline"
        />
        <LinkOgFields
          appId={appId}
          linkId={linkId}
          ogImageCacheKey={form.ogImageCacheKey}
          ogImageUrl={form.ogImageUrl}
          onChange={(og) => patch({ og })}
          onImageUrlChange={(ogImageUrl) => patch({ ogImageUrl })}
          onOgImageCacheKeyChange={(ogImageCacheKey) =>
            patch({ ogImageCacheKey })
          }
          onPendingFileChange={(ogPendingFile) => patch({ ogPendingFile })}
          pendingFile={form.ogPendingFile}
          showSocialPreview={false}
          values={form.og}
        />
      </TabsContent>

      <TabsContent className="space-y-4" value="routing">
        <LinkDeviceRoutingFields
          onChange={(device) => patch({ device })}
          values={form.device}
        />
      </TabsContent>

      <TabsContent className="space-y-4" value="utm">
        <LinkUtmFields onChange={(utm) => patch({ utm })} values={form.utm} />
      </TabsContent>
    </Tabs>
  );
}
