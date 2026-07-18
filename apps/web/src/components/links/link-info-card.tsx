'use client';

import { LinkSquare02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import type { LinkDetail } from '@phase/shared';
import { ClientDate } from '@/components/client-date';
import { DEVICE_FIELDS } from '@/components/links/link-device-routing-fields';
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
import { formatUrlWithoutProtocol, getPrimaryLinkUrl } from '@/lib/link-urls';
import { cn } from '@/lib/utils';

type LinkInfoCardProps = {
  link: LinkDetail;
  domains: Array<{ id: string; hostname: string; status: string }>;
  className?: string;
};

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

function DetailEntries({
  entries,
}: {
  entries: Array<{
    key: string;
    label: string;
    value: string;
    icon?: IconSvgElement;
  }>;
}) {
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {entries.map((entry) => (
        <div className="space-y-0.5" key={entry.key}>
          <dt className="flex items-center gap-1.5 text-muted-foreground text-xs">
            {entry.icon ? (
              <HugeiconsIcon className="size-3.5" icon={entry.icon} />
            ) : null}
            {entry.label}
          </dt>
          <dd className="break-all font-medium text-sm">{entry.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function IconValueRows({
  entries,
}: {
  entries: Array<{
    key: string;
    value: string;
    icon: IconSvgElement;
  }>;
}) {
  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li className="flex items-start gap-2" key={entry.key}>
          <HugeiconsIcon
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            icon={entry.icon}
          />
          <span className="min-w-0 break-all font-medium text-sm">
            {entry.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function LinkInfoCard({ link, domains, className }: LinkInfoCardProps) {
  const { url: shortUrl, display: shortDisplay } = getPrimaryLinkUrl(
    link.slug,
    link.domainId,
    domains
  );
  const utm = linkUtmFromDetail(link);
  const utmEntries = getLinkUtmDisplayEntries(utm);
  const deviceEntries = DEVICE_FIELDS.map((field) => ({
    key: field.key,
    icon: field.icon,
    value: formatUrlWithoutProtocol(link[field.key] ?? ''),
  })).filter((entry) => entry.value);

  return (
    <Card className={cn('flex h-full flex-col py-0', className)}>
      <CardContent className="flex flex-1 flex-col space-y-4 p-4">
        <h2 className="font-semibold text-muted-foreground text-sm uppercase">
          Link details
        </h2>

        <div>
          <p className="text-muted-foreground text-xs uppercase">Short link</p>
          <div className="mt-0.5 flex max-w-full items-center gap-2 font-medium text-sm">
            <code className="min-w-0 break-all">{shortDisplay}</code>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  className="shrink-0"
                  size="icon-sm"
                  variant="outline"
                >
                  <a href={shortUrl} rel="noopener noreferrer" target="_blank">
                    <HugeiconsIcon className="size-4" icon={LinkSquare02Icon} />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open link</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <InfoRow label="Destination">
          <p className="break-all font-medium text-sm">
            {formatUrlWithoutProtocol(link.destinationUrl)}
          </p>
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
              <DetailEntries entries={utmEntries} />
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
            {deviceEntries.length > 0 ? (
              <IconValueRows entries={deviceEntries} />
            ) : (
              <p className="text-muted-foreground text-sm">None</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
