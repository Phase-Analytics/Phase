'use client';

import {
  AndroidIcon,
  AnonymousIcon,
  AppleIcon,
  BrowserIcon,
  ComputerPhoneSyncIcon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { parseAsString, useQueryState } from 'nuqs';
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { getGeneratedName, UserAvatar } from '@/components/user-profile';
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

function getCountryFlag(countryCode: string | null) {
  if (!countryCode || countryCode.length !== 2) {
    return null;
  }
  return String.fromCodePoint(
    ...[...countryCode.toUpperCase()].map(
      (char) => 0x1_f1_e6 - 65 + char.charCodeAt(0)
    )
  );
}

function getCountryLabel(countryCode: string | null) {
  if (!countryCode) {
    return null;
  }
  return (
    new Intl.DisplayNames(['en'], {
      type: 'region',
    }).of(countryCode) || countryCode
  );
}

type UserDetailCardProps = {
  deviceId: string;
};

export function UserDetailCard({ deviceId }: UserDetailCardProps) {
  const [appId] = useQueryState('app', parseAsString);
  const { data: device } = useDevice(deviceId, appId || '');

  const generatedName = useMemo(() => {
    if (!device?.deviceId) {
      return '';
    }
    return getGeneratedName(device.deviceId);
  }, [device?.deviceId]);

  if (!(appId && device)) {
    return null;
  }

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">User Information</h2>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full">
              <UserAvatar seed={device.deviceId} size={80} variant="marble" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="font-semibold text-xl">{generatedName}</h2>
              <div className="flex items-center gap-2">
                <CopyButton
                  className="size-4 text-muted-foreground [&_svg]:size-4"
                  content={device.deviceId}
                  variant="ghost"
                />
                <p
                  className="truncate font-mono text-muted-foreground text-xs"
                  title={device.deviceId}
                >
                  {device.deviceId}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-muted-foreground text-sm">Location</p>
            <div className="mt-1">
              {(() => {
                const flag = getCountryFlag(device.country);
                const countryLabel = getCountryLabel(device.country);
                const city = device.city;

                const hasLocation = flag || countryLabel || city;

                if (!hasLocation) {
                  return <p className="font-medium text-sm">Unknown</p>;
                }

                return (
                  <p className="flex items-center gap-1.5 font-medium text-sm">
                    {flag && <span>{flag}</span>}
                    {countryLabel && (
                      <span>
                        {countryLabel}
                        {city && (
                          <span className="text-muted-foreground">, </span>
                        )}
                      </span>
                    )}
                    {city && <span>{city}</span>}
                  </p>
                );
              })()}
            </div>
          </div>

          <div>
            <p className="text-muted-foreground text-sm">Device</p>
            <div className="mt-1 space-y-2">
              <p className="flex items-center gap-1.5 font-medium text-sm">
                <HugeiconsIcon
                  className="fade-in size-4 animate-in text-muted-foreground duration-300"
                  icon={getPlatformIcon(device.platform)}
                />
                <span>
                  {getPlatformLabel(device.platform)}
                  {device.osVersion && (
                    <span className="font-mono text-muted-foreground">
                      {' '}
                      {device.osVersion}
                    </span>
                  )}
                </span>
              </p>
              <p className="flex items-center gap-1.5 font-medium text-sm">
                <HugeiconsIcon
                  className="size-4 text-muted-foreground"
                  icon={ComputerPhoneSyncIcon}
                />
                <span>{device.model || 'Unknown'}</span>
              </p>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground text-sm">App Version</p>
            <p className="mt-1 flex items-center gap-1.5 font-medium font-mono text-sm">
              <HugeiconsIcon
                className="size-4 text-muted-foreground"
                icon={InformationCircleIcon}
              />
              <span>{device.appVersion || 'Unknown'}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
