'use client';

import {
  AndroidIcon,
  AnonymousIcon,
  AppleIcon,
  BrowserIcon,
  ComputerPhoneSyncIcon,
  Flag02Icon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { parseAsString, useQueryState } from 'nuqs';
import { Card, CardContent } from '@/components/ui/card';
import { useDevice } from '@/lib/queries';

function getPlatformIcon(platform: string | null) {
  switch (platform) {
    case 'android':
      return AndroidIcon;
    case 'ios':
      return AppleIcon;
    case 'web':
      return BrowserIcon;
    default:
      return AnonymousIcon;
  }
}

function getPlatformLabel(platform: string | null) {
  switch (platform) {
    case 'android':
      return 'Android';
    case 'ios':
      return 'iOS';
    case 'web':
      return 'Web';
    default:
      return 'Unknown';
  }
}

type DeviceInformationCardProps = {
  deviceId: string;
};

export function DeviceInformationCard({
  deviceId,
}: DeviceInformationCardProps) {
  const [appId] = useQueryState('app', parseAsString);
  const { data: device } = useDevice(deviceId, appId || '');

  if (!(appId && device)) {
    return null;
  }

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">Device Information</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                className="fade-in size-4 animate-in duration-300"
                icon={getPlatformIcon(device.platform)}
              />
              <p className="text-muted-foreground text-sm">Platform</p>
            </div>
            <p className="mt-1 font-medium text-sm">
              {getPlatformLabel(device.platform)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon className="size-4" icon={InformationCircleIcon} />
              <p className="text-muted-foreground text-sm">OS Version</p>
            </div>
            <p className="mt-1 font-medium text-sm">
              {device.osVersion || 'Unknown'}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon className="size-4" icon={ComputerPhoneSyncIcon} />
              <p className="text-muted-foreground text-sm">Model</p>
            </div>
            <p className="mt-1 font-medium text-sm">
              {device.model || 'Unknown'}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon className="size-4" icon={InformationCircleIcon} />
              <p className="text-muted-foreground text-sm">App Version</p>
            </div>
            <p className="mt-1 font-medium text-sm">
              {device.appVersion || 'Unknown'}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2">
              {device.country ? (
                <span className="fade-in animate-in text-base duration-300">
                  {String.fromCodePoint(
                    ...[...device.country.toUpperCase()].map(
                      (char) => 0x1_f1_e6 - 65 + char.charCodeAt(0)
                    )
                  )}
                </span>
              ) : (
                <HugeiconsIcon
                  className="fade-in size-4 animate-in duration-300"
                  icon={Flag02Icon}
                />
              )}
              <p className="text-muted-foreground text-sm">Country</p>
            </div>
            <p className="mt-1 font-medium text-sm">
              {device.country
                ? new Intl.DisplayNames(['en'], {
                    type: 'region',
                  }).of(device.country) || device.country
                : 'Unknown'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
