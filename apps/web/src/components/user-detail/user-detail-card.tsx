'use client';

import {
  AndroidIcon,
  AnonymousIcon,
  AppleIcon,
  ComputerIcon,
  Flag02Icon,
  InformationCircleIcon,
  LanguageSquareIcon,
  SmartPhone01Icon,
  Tablet01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { parseAsString, useQueryState } from 'nuqs';
import { useMemo } from 'react';
import 'flag-icons/css/flag-icons.min.css';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { getGeneratedName, UserAvatar } from '@/components/user-profile';
import { useDevice } from '@/lib/queries';

const COUNTRY_CODE_REGEX = /^[A-Za-z]{2}$/;

function getPlatformIcon(platform: string | null) {
  switch (platform) {
    case 'android':
      return AndroidIcon;
    case 'ios':
      return AppleIcon;
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
    default:
      return 'Unknown';
  }
}

function getDeviceTypeIcon(deviceType: string | null) {
  switch (deviceType) {
    case 'phone':
      return SmartPhone01Icon;
    case 'tablet':
      return Tablet01Icon;
    case 'desktop':
      return ComputerIcon;
    default:
      return AnonymousIcon;
  }
}

function getDeviceTypeLabel(deviceType: string | null) {
  switch (deviceType) {
    case 'phone':
      return 'Phone';
    case 'tablet':
      return 'Tablet';
    case 'desktop':
      return 'Desktop';
    default:
      return 'Unknown';
  }
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
    <Card className="min-w-0 py-0">
      <CardContent className="min-w-0 space-y-4 p-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-muted-foreground text-sm uppercase">
            User Information
          </h2>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full">
              <UserAvatar seed={device.deviceId} size={80} variant="marble" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <h2 className="font-semibold text-xl">{generatedName}</h2>
              <div className="flex min-w-0 items-center gap-2">
                <CopyButton
                  className="size-4 shrink-0 text-muted-foreground [&_svg]:size-4"
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
            <p className="text-muted-foreground text-xs uppercase">Geo</p>
            <div className="mt-1 space-y-2">
              {(() => {
                const countryLabel = getCountryLabel(device.country);
                const city = device.city;
                const hasValidCountry =
                  device.country &&
                  device.country.length === 2 &&
                  COUNTRY_CODE_REGEX.test(device.country);

                const hasLocation = hasValidCountry || countryLabel || city;

                if (!hasLocation) {
                  return (
                    <p className="flex items-center gap-1.5 font-medium text-sm">
                      <HugeiconsIcon
                        className="size-3.5 text-muted-foreground"
                        icon={Flag02Icon}
                      />
                      <span>Unknown</span>
                    </p>
                  );
                }

                return (
                  <p className="flex items-center gap-1.5 font-medium text-sm">
                    {!device.country ||
                    device.country.length !== 2 ||
                    !COUNTRY_CODE_REGEX.test(device.country) ? (
                      <HugeiconsIcon
                        className="size-3.5 text-muted-foreground"
                        icon={Flag02Icon}
                      />
                    ) : (
                      <span
                        className={`fi fi-${device.country.toLowerCase()} rounded-xs text-[14px]`}
                        title={countryLabel || device.country}
                      />
                    )}
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
              {device.locale && (
                <p className="flex items-center gap-1.5 font-medium text-sm">
                  <HugeiconsIcon
                    className="size-4 text-muted-foreground"
                    icon={LanguageSquareIcon}
                  />
                  <span>{device.locale}</span>
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="text-muted-foreground text-xs uppercase">Device</p>
            <div className="mt-1 space-y-2">
              <p className="flex items-center gap-1.5 font-medium text-sm">
                <HugeiconsIcon
                  className="size-4 text-muted-foreground"
                  icon={getPlatformIcon(device.platform)}
                />
                <span>
                  {getPlatformLabel(device.platform)}
                  {device.osVersion && (
                    <span className="text-muted-foreground">
                      {' '}
                      {device.osVersion}
                    </span>
                  )}
                </span>
              </p>
              {device.deviceType && (
                <p className="flex items-center gap-1.5 font-medium text-sm">
                  <HugeiconsIcon
                    className="size-4 text-muted-foreground"
                    icon={getDeviceTypeIcon(device.deviceType)}
                  />
                  <span>{getDeviceTypeLabel(device.deviceType)}</span>
                </p>
              )}
            </div>
          </div>

          {device.appVersion && (
            <div>
              <p className="text-muted-foreground text-xs uppercase">
                App Version
              </p>
              <p className="mt-1 flex items-center gap-1.5 font-medium text-sm">
                <HugeiconsIcon
                  className="size-4 text-muted-foreground"
                  icon={InformationCircleIcon}
                />
                <span>{device.appVersion}</span>
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
