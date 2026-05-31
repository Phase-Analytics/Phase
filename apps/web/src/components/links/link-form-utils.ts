import type { LinkDetail } from '@phase/shared';
import {
  deviceRoutingFromDetail,
  emptyDeviceRoutingValues,
  hasDeviceRoutingValues,
  type LinkDeviceRoutingValues,
} from '@/components/links/link-device-routing-fields';
import {
  emptyLinkUtmValues,
  hasLinkUtmValues,
  linkUtmFromDetail,
  type LinkUtmValues,
} from '@/components/links/link-utm-fields';
import { formatUrlWithoutProtocol } from '@/lib/link-urls';

export const PHASE_HOST_VALUE = 'phase';

export type LinkFormState = {
  hostValue: string;
  slug: string;
  destinationUrl: string;
  utmEnabled: boolean;
  utm: LinkUtmValues;
  deviceEnabled: boolean;
  device: LinkDeviceRoutingValues;
  expiresAt?: Date;
  disabled: boolean;
};

export function emptyLinkFormState(): LinkFormState {
  return {
    hostValue: PHASE_HOST_VALUE,
    slug: '',
    destinationUrl: '',
    utmEnabled: false,
    utm: emptyLinkUtmValues(),
    deviceEnabled: false,
    device: emptyDeviceRoutingValues(),
    expiresAt: undefined,
    disabled: false,
  };
}

export function linkDetailToFormState(link: LinkDetail): LinkFormState {
  const utm = linkUtmFromDetail(link);
  const device = deviceRoutingFromDetail(link);

  return {
    hostValue:
      link.domainIds.length === 1 ? link.domainIds[0] : PHASE_HOST_VALUE,
    slug: link.slug,
    destinationUrl: formatUrlWithoutProtocol(link.destinationUrl),
    utmEnabled: hasLinkUtmValues(utm),
    utm,
    deviceEnabled: hasDeviceRoutingValues(device),
    device,
    expiresAt: link.expiresAt ? new Date(link.expiresAt) : undefined,
    disabled: Boolean(link.disabledAt),
  };
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
