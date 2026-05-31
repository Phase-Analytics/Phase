'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { use, useMemo, useState } from 'react';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-page-header';
import { LinkAnalytics } from '@/components/links/link-analytics';
import { LinkQrCard } from '@/components/links/link-qr-card';
import { LinkSettingsPanel } from '@/components/links/link-settings-panel';
import { LinkShortUrlsCard } from '@/components/links/link-short-urls-card';
import { RequireApp } from '@/components/require-app';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getLinkShortUrls } from '@/lib/link-urls';
import { useLink, useLinkDomains } from '@/lib/queries';

export default function LinkDetailPage({
  params,
}: {
  params: Promise<{ linkId: string }>;
}) {
  const { linkId } = use(params);
  const [appId] = useQueryState('app', parseAsString);
  const { data: link, isPending } = useLink(appId ?? '', linkId);
  const { data: domainsData } = useLinkDomains(appId ?? '');

  const shortUrlOptions = useMemo(() => {
    if (!link) {
      return [];
    }
    return getLinkShortUrls(
      link.slug,
      domainsData?.domains ?? [],
      link.domainIds
    );
  }, [link, domainsData?.domains]);

  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const activeQrUrl = qrUrl ?? shortUrlOptions[0]?.url ?? link?.shortUrl ?? '';

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        {isPending || !link ? (
          <Skeleton className="h-12 w-64" />
        ) : (
          <DashboardPageHeader
            description={link.destinationUrl}
            title={link.slug}
          />
        )}

        {link && appId ? (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent className="space-y-4" value="overview">
              <div className="grid gap-4 lg:grid-cols-2">
                <LinkShortUrlsCard
                  boundDomainIds={link.domainIds}
                  disabledAt={link.disabledAt}
                  domains={domainsData?.domains ?? []}
                  expiresAt={link.expiresAt}
                  slug={link.slug}
                />
                <div className="space-y-4">
                  {shortUrlOptions.length > 1 ? (
                    <Card className="py-0">
                      <CardContent className="space-y-2 p-4">
                        <p className="font-medium text-sm">QR code URL</p>
                        <select
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                          onChange={(e) => setQrUrl(e.target.value)}
                          value={activeQrUrl}
                        >
                          {shortUrlOptions.map((opt) => (
                            <option key={opt.url} value={opt.url}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </CardContent>
                    </Card>
                  ) : null}
                  <LinkQrCard shortUrl={activeQrUrl} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <LinkAnalytics appId={appId} linkId={linkId} />
            </TabsContent>

            <TabsContent value="settings">
              <Card className="py-0">
                <CardContent className="p-4">
                  <LinkSettingsPanel appId={appId} link={link} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : null}
      </div>
    </RequireApp>
  );
}
