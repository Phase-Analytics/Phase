'use client';

import { Image01Icon, LinkSquare02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import type { LinkDetail } from '@phase/shared';
import { ClientDate } from '@/components/client-date';
import { DEVICE_FIELDS } from '@/components/links/link-device-routing-fields';
import {
  hasLinkOgPreview,
  LINK_OG_TEXT_FIELDS,
} from '@/components/links/link-og-fields';
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
import { getLinkOgImageSrc } from '@/lib/link-og-image-url';
import { formatUrlWithoutProtocol, getPrimaryLinkUrl } from '@/lib/link-urls';

type LinkInfoCardProps = {
  link: LinkDetail;
  domains: Array<{ id: string; hostname: string; status: string }>;
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

export function LinkInfoCard({ link, domains }: LinkInfoCardProps) {
  const { url: shortUrl, display: shortDisplay } = getPrimaryLinkUrl(
    link.slug,
    link.domainIds,
    domains
  );
  const utm = linkUtmFromDetail(link);
  const utmEntries = getLinkUtmDisplayEntries(utm);
  const ogImageSrc = getLinkOgImageSrc(link.ogImageUrl, link.updatedAt);

  const ogTextEntries = LINK_OG_TEXT_FIELDS.map((field) => ({
    key: field.key,
    icon: field.icon,
    value:
      field.key === 'title' ? (link.ogTitle ?? '') : (link.ogDescription ?? ''),
  })).filter((entry) => entry.value.trim());

  const deviceEntries = DEVICE_FIELDS.map((field) => ({
    key: field.key,
    icon: field.icon,
    value: formatUrlWithoutProtocol(link[field.key] ?? ''),
  })).filter((entry) => entry.value);

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
                  <a href={shortUrl} rel="noopener noreferrer" target="_blank">
                    <HugeiconsIcon className="size-4" icon={LinkSquare02Icon} />
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
            Social preview
          </p>
          <div className="mt-1">
            {hasLinkOgPreview(link) ? (
              <div className="space-y-2">
                {ogTextEntries.length > 0 ? (
                  <IconValueRows entries={ogTextEntries} />
                ) : null}
                {ogImageSrc ? (
                  <div className="flex items-start gap-2">
                    <HugeiconsIcon
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      icon={Image01Icon}
                    />
                    {/* biome-ignore lint/performance/noImgElement: external R2 preview URL */}
                    <img
                      alt="Link preview"
                      className="aspect-[1200/630] w-full max-w-[200px] rounded-md border object-cover"
                      height={105}
                      src={ogImageSrc}
                      width={200}
                    />
                  </div>
                ) : null}
              </div>
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
