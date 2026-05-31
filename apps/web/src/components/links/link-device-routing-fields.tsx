'use client';

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

export function LinkDeviceRoutingFields({
  values,
  onChange,
}: LinkDeviceRoutingFieldsProps) {
  const set =
    (key: keyof LinkDeviceRoutingValues) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...values, [key]: e.target.value });
    };

  return (
    <div className="space-y-3">
      <p className="font-medium text-sm">Device routing</p>
      <p className="text-muted-foreground text-xs">
        Optional overrides by platform. Empty uses the destination URL.
      </p>
      <div className="space-y-3">
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="device_ios">
            iOS
          </label>
          <Input
            id="device_ios"
            onChange={set('deviceIosUrl')}
            placeholder="https://apps.apple.com/..."
            type="url"
            value={values.deviceIosUrl}
          />
        </div>
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="device_android">
            Android
          </label>
          <Input
            id="device_android"
            onChange={set('deviceAndroidUrl')}
            placeholder="https://play.google.com/..."
            type="url"
            value={values.deviceAndroidUrl}
          />
        </div>
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="device_others">
            Others (desktop, tablet, etc.)
          </label>
          <Input
            id="device_others"
            onChange={set('deviceOthersUrl')}
            placeholder="https://example.com/landing"
            type="url"
            value={values.deviceOthersUrl}
          />
        </div>
      </div>
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
