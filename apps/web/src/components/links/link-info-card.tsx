'use client';

import { LinkSquare02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { LinkDetail } from '@phase/shared';
import { ClientDate } from '@/components/client-date';
import { hasDeviceRoutingValues } from '@/components/links/link-device-routing-fields';
import { LinkStatusBadge } from '@/components/links/link-status-badge';
import {
  getLinkUtmDisplayEntries,
  hasLinkUtmValues,
  linkUtmFromDetail,
} from '@/components/links/link-utm-fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

type LinkInfoCardProps = {
  link: LinkDetail;
  domains: Array<{ id: string; hostname: string; status: string }>;
};

const DEVICE_ROW_KEYS = [
  'deviceIosUrl',
  'deviceAndroidUrl',
  'deviceOthersUrl',
] as const;

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs uppercase">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

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

  const utmEntries = getLinkUtmDisplayEntries(utm);

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <h2 className="font-semibold text-muted-foreground text-sm uppercase">
          Link details
        </h2>

        <InfoRow label="Short link">
          <div className="inline-flex max-w-full items-center gap-2 font-medium text-sm">
            <code className="break-all">{shortDisplay}</code>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  className="shrink-0"
                  size="icon-sm"
                  variant="outline"
                >
                  <a
                    href={shortUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <HugeiconsIcon
                      className="size-4"
                      icon={LinkSquare02Icon}
                    />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open link</TooltipContent>
            </Tooltip>
          </div>
        </InfoRow>

        <InfoRow label="Destination">
          <p className="break-all font-medium text-sm">
            {formatUrlWithoutProtocol(link.destinationUrl)}
          </p>
        </InfoRow>

        <InfoRow label="Status">
          <LinkStatusBadge status={status} />
        </InfoRow>

        <InfoRow label="Expires">
          <p className="font-medium text-sm">
            {link.expiresAt ? (
              <ClientDate date={link.expiresAt} format="datetime-long" />
            ) : (
              'No expiry'
            )}
          </p>
        </InfoRow>

        <div>
          <p className="text-muted-foreground text-xs uppercase">UTM</p>
          <div className="mt-1">
            {hasLinkUtmValues(utm) ? (
              <dl className="grid gap-2 sm:grid-cols-2">
                {utmEntries.map((entry) => (
                  <div className="space-y-0.5" key={entry.key}>
                    <dt className="text-muted-foreground text-xs">
                      {entry.label}
                    </dt>
                    <dd className="break-all font-medium text-sm">
                      {entry.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-muted-foreground text-sm">None</p>
            )}
          </div>
        </div>

        <div>
          <p className="text-muted-foreground text-xs uppercase">
            Device routing
          </p>
          <div className="mt-1">
            {hasDeviceRoutingValues(deviceValues) ? (
              <ul className="space-y-2">
                {DEVICE_ROW_KEYS.map((key) => {
                  const value = deviceValues[key];
                  if (!value) {
                    return null;
                  }

                  return (
                    <li className="break-all font-medium text-sm" key={key}>
                      {formatUrlWithoutProtocol(value)}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">None</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
