import type { LinkDetail } from '@phase/shared';
import {
  deviceRoutingFromDetail,
  emptyDeviceRoutingValues,
  hasDeviceRoutingValues,
  type LinkDeviceRoutingValues,
} from '@/components/links/link-device-routing-fields';
import {
  emptyLinkOgValues,
  hasLinkOgPreview,
  hasLinkOgTextValues,
  type LinkOgValues,
  linkOgFromDetail,
} from '@/components/links/link-og-fields';
import {
  emptyLinkUtmValues,
  hasLinkUtmValues,
  type LinkUtmValues,
  linkUtmFromDetail,
} from '@/components/links/link-utm-fields';
import { formatUrlWithoutProtocol } from '@/lib/link-urls';

export const PHASE_HOST_VALUE = 'phase';

export type LinkFormState = {
  name: string;
  hostValue: string;
  slug: string;
  destinationUrl: string;
  utmEnabled: boolean;
  utm: LinkUtmValues;
  deviceEnabled: boolean;
  device: LinkDeviceRoutingValues;
  ogEnabled: boolean;
  og: LinkOgValues;
  ogImageUrl: string | null;
  ogImageCacheKey: string | null;
  ogPendingFile: File | null;
  expiresAt?: Date;
  disabled: boolean;
};

export function emptyLinkFormState(): LinkFormState {
  return {
    name: '',
    hostValue: PHASE_HOST_VALUE,
    slug: '',
    destinationUrl: '',
    utmEnabled: false,
    utm: emptyLinkUtmValues(),
    deviceEnabled: false,
    device: emptyDeviceRoutingValues(),
    ogEnabled: false,
    og: emptyLinkOgValues(),
    ogImageUrl: null,
    ogImageCacheKey: null,
    ogPendingFile: null,
    expiresAt: undefined,
    disabled: false,
  };
}

export function linkDetailToFormState(link: LinkDetail): LinkFormState {
  const utm = linkUtmFromDetail(link);
  const device = deviceRoutingFromDetail(link);
  const og = linkOgFromDetail(link);

  return {
    name: link.name ?? '',
    hostValue: link.domainId ?? PHASE_HOST_VALUE,
    slug: link.slug,
    destinationUrl: formatUrlWithoutProtocol(link.destinationUrl),
    utmEnabled: hasLinkUtmValues(utm),
    utm,
    deviceEnabled: hasDeviceRoutingValues(device),
    device,
    ogEnabled: hasLinkOgPreview(link),
    og,
    ogImageUrl: link.ogImageUrl,
    ogImageCacheKey: link.updatedAt,
    ogPendingFile: null,
    expiresAt: link.expiresAt ? new Date(link.expiresAt) : undefined,
    disabled: Boolean(link.disabledAt),
  };
}

export function linkOgEnabledFromForm(form: LinkFormState): boolean {
  return (
    form.ogEnabled ||
    hasLinkOgTextValues(form.og) ||
    Boolean(form.ogImageUrl) ||
    Boolean(form.ogPendingFile)
  );
}

export function expiresAtToIso(date: Date | undefined): string | null {
  if (!date) {
    return null;
  }

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  ).toISOString();
}
