'use client';

import type { LinkDetail } from '@phase/shared';
import {
  AndroidIcon,
  AppleIcon,
  BrowserIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  formatUrlWithoutProtocol,
  getLinkStatus,
  getPrimaryLinkUrl,
} from '@/lib/link-urls';
import { hasDeviceRoutingValues } from '@/components/links/link-device-routing-fields';
import { hasLinkUtmValues, linkUtmFromDetail } from '@/components/links/link-utm-fields';

type LinkInfoCardProps = {
  link: LinkDetail;
  domains: Array<{ id: string; hostname: string; status: string }>;
};

const DEVICE_ROWS = [
  { key: 'deviceIosUrl' as const, icon: AppleIcon, label: 'iOS' },
  { key: 'deviceAndroidUrl' as const, icon: AndroidIcon, label: 'Android' },
  { key: 'deviceOthersUrl' as const, icon: BrowserIcon, label: 'Others' },
];

export function LinkInfoCard({ link, domains }: LinkInfoCardProps) {
  const { url: shortUrl, display: shortDisplay } = getPrimaryLinkUrl(
    link.slug,
    link.domainIds,
    domains
  );
  const utm = linkUtmFromDetail(link);
  const status = getLinkStatus(link);
  const deviceValues = {
    deviceIosUrl: link.deviceIosUrl ?? '',
    deviceAndroidUrl: link.deviceAndroidUrl ?? '',
    deviceOthersUrl: link.deviceOthersUrl ?? '',
  };

  const utmEntries = [
    { label: 'utm_source', value: utm.utmSource },
    { label: 'utm_medium', value: utm.utmMedium },
    { label: 'utm_campaign', value: utm.utmCampaign },
    { label: 'utm_term', value: utm.utmTerm },
    { label: 'utm_content', value: utm.utmContent },
  ].filter((entry) => entry.value);

  return (
    <Card className="py-0">
      <CardContent className="space-y-5 p-4">
        <div className="space-y-1">
          <p className="font-semibold text-muted-foreground text-sm uppercase">
            Short link
          </p>
          <div className="flex items-center gap-2">
            <code className="break-all text-sm">{shortDisplay}</code>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <CopyButton content={shortUrl} size="sm" variant="outline" />
                </div>
              </TooltipTrigger>
              <TooltipContent>Copy link</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="space-y-1">
          <p className="font-semibold text-muted-foreground text-sm uppercase">
            Destination
          </p>
          <p className="break-all text-sm">
            {formatUrlWithoutProtocol(link.destinationUrl)}
          </p>
        </div>

        {hasLinkUtmValues(utm) ? (
          <div className="space-y-2">
            <p className="font-semibold text-muted-foreground text-sm uppercase">
              UTM
            </p>
            <dl className="grid gap-2 sm:grid-cols-2">
              {utmEntries.map((entry) => (
                <div className="space-y-0.5" key={entry.label}>
                  <dt className="text-muted-foreground text-xs">{entry.label}</dt>
                  <dd className="break-all text-sm">{entry.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {hasDeviceRoutingValues(deviceValues) ? (
          <div className="space-y-2">
            <p className="font-semibold text-muted-foreground text-sm uppercase">
              Device routing
            </p>
            <ul className="space-y-2">
              {DEVICE_ROWS.map((row) => {
                const value = deviceValues[row.key];
                if (!value) {
                  return null;
                }

                return (
                  <li className="flex items-start gap-2" key={row.key}>
                    <HugeiconsIcon
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      icon={row.icon}
                    />
                    <span className="break-all text-sm">
                      {formatUrlWithoutProtocol(value)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {link.expiresAt ? (
          <div className="space-y-1">
            <p className="font-semibold text-muted-foreground text-sm uppercase">
              Expires
            </p>
            <p className="text-sm">
              {new Date(link.expiresAt).toLocaleString()}
            </p>
          </div>
        ) : null}

        {status === 'disabled' ? (
          <p className="text-destructive text-sm">Disabled</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
