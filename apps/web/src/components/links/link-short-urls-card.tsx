'use client';

import type { LinkDomain } from '@phase/shared';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { getLinkShortUrls } from '@/lib/link-urls';

type LinkShortUrlsCardProps = {
  slug: string;
  domains: LinkDomain[];
  boundDomainIds: string[];
  expiresAt: string | null;
  disabledAt: string | null;
};

export function LinkShortUrlsCard({
  slug,
  domains,
  boundDomainIds,
  expiresAt,
  disabledAt,
}: LinkShortUrlsCardProps) {
  const urls = getLinkShortUrls(slug, domains, boundDomainIds);

  return (
    <Card className="py-0">
      <CardContent className="space-y-3 p-4">
        <p className="font-semibold text-muted-foreground text-sm uppercase">
          Short URLs
        </p>
        <ul className="space-y-3">
          {urls.map((entry) => (
            <li className="space-y-1" key={entry.url}>
              <p className="text-muted-foreground text-xs">{entry.label}</p>
              <div className="flex items-center gap-2">
                <code className="break-all text-sm">{entry.url}</code>
                <CopyButton content={entry.url} size="sm" />
              </div>
            </li>
          ))}
        </ul>
        {expiresAt ? (
          <p className="text-muted-foreground text-sm">
            Expires {new Date(expiresAt).toLocaleString()}
          </p>
        ) : null}
        {disabledAt ? (
          <p className="text-destructive text-sm">Disabled</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
