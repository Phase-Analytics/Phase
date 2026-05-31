'use client';

import {
  AndroidIcon,
  AppleIcon,
  BrowserIcon,
  Clock04Icon,
  Link01Icon,
  Link05Icon,
  LinkSquare02Icon,
} from '@hugeicons/core-free-icons';
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

const DEVICE_ROWS = [
  { key: 'deviceIosUrl' as const, icon: AppleIcon },
  { key: 'deviceAndroidUrl' as const, icon: AndroidIcon },
  { key: 'deviceOthersUrl' as const, icon: BrowserIcon },
];

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
          <div className="flex items-center gap-2">
            <p className="flex min-w-0 flex-1 items-center gap-1.5 font-medium text-sm">
              <HugeiconsIcon
                className="size-4 shrink-0 text-muted-foreground"
                icon={Link05Icon}
              />
              <code className="break-all">{shortDisplay}</code>
            </p>
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
          <p className="flex items-start gap-1.5 font-medium text-sm">
            <HugeiconsIcon
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              icon={Link01Icon}
            />
            <span className="break-all">
              {formatUrlWithoutProtocol(link.destinationUrl)}
            </span>
          </p>
        </InfoRow>

        <InfoRow label="Status">
          <LinkStatusBadge status={status} />
        </InfoRow>

        <InfoRow label="Expires">
          <p className="flex items-center gap-1.5 font-medium text-sm">
            <HugeiconsIcon
              className="size-4 shrink-0 text-muted-foreground"
              icon={Clock04Icon}
            />
            {link.expiresAt ? (
              <ClientDate date={link.expiresAt} format="datetime-long" />
            ) : (
              <span>No expiry</span>
            )}
          </p>
        </InfoRow>

        <div>
          <p className="text-muted-foreground text-xs uppercase">UTM</p>
          <div className="mt-1">
            {hasLinkUtmValues(utm) ? (
              <dl className="space-y-2">
                {utmEntries.map((entry) => (
                  <div key={entry.key}>
                    <dt className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <HugeiconsIcon
                        className="size-3.5 shrink-0"
                        icon={entry.icon}
                      />
                      {entry.label}
                    </dt>
                    <dd className="mt-0.5 break-all pl-5 font-medium text-sm">
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
                      <span className="break-all font-medium text-sm">
                        {formatUrlWithoutProtocol(value)}
                      </span>
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
