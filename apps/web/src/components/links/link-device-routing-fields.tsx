'use client';

import {
  AndroidIcon,
  AppleIcon,
  BrowserIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Input } from '@/components/ui/input';

export type LinkDeviceRoutingValues = {
  deviceIosUrl: string;
  deviceAndroidUrl: string;
  deviceOthersUrl: string;
};

type LinkDeviceRoutingFieldsProps = {
  values: LinkDeviceRoutingValues;
  onChange: (values: LinkDeviceRoutingValues) => void;
};

const DEVICE_FIELDS = [
  {
    key: 'deviceIosUrl' as const,
    icon: AppleIcon,
    id: 'device_ios',
  },
  {
    key: 'deviceAndroidUrl' as const,
    icon: AndroidIcon,
    id: 'device_android',
  },
  {
    key: 'deviceOthersUrl' as const,
    icon: BrowserIcon,
    id: 'device_others',
  },
];

export function LinkDeviceRoutingFields({
  values,
  onChange,
}: LinkDeviceRoutingFieldsProps) {
  return (
    <div className="space-y-3">
      {DEVICE_FIELDS.map(({ key, icon, id }) => (
        <div className="flex items-center gap-2" key={key}>
          <HugeiconsIcon
            className="size-4 shrink-0 text-muted-foreground"
            icon={icon}
          />
          <Input
            className="min-w-0 flex-1"
            id={id}
            onChange={(e) => onChange({ ...values, [key]: e.target.value })}
            placeholder="https://"
            type="url"
            value={values[key]}
          />
        </div>
      ))}
    </div>
  );
}

export function emptyDeviceRoutingValues(): LinkDeviceRoutingValues {
  return {
    deviceIosUrl: '',
    deviceAndroidUrl: '',
    deviceOthersUrl: '',
  };
}

export function deviceRoutingToPayload(values: LinkDeviceRoutingValues) {
  return {
    deviceIosUrl: values.deviceIosUrl || null,
    deviceAndroidUrl: values.deviceAndroidUrl || null,
    deviceOthersUrl: values.deviceOthersUrl || null,
  };
}

export function deviceRoutingFromDetail(link: {
  deviceIosUrl: string | null;
  deviceAndroidUrl: string | null;
  deviceOthersUrl: string | null;
}): LinkDeviceRoutingValues {
  return {
    deviceIosUrl: link.deviceIosUrl ?? '',
    deviceAndroidUrl: link.deviceAndroidUrl ?? '',
    deviceOthersUrl: link.deviceOthersUrl ?? '',
  };
}

export function hasDeviceRoutingValues(
  values: LinkDeviceRoutingValues
): boolean {
  return Boolean(
    values.deviceIosUrl || values.deviceAndroidUrl || values.deviceOthersUrl
  );
}
