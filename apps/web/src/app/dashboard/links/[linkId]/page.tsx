'use client';

import { ArrowTurnBackwardIcon, Edit02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import { use, useMemo } from 'react';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-page-header';
import { EditLinkDialog } from '@/components/links/edit-link-dialog';
import { LinkAnalytics } from '@/components/links/link-analytics';
import { LinkClicksTable } from '@/components/links/link-clicks-table';
import { LinkInfoCard } from '@/components/links/link-info-card';
import { LinkOgPreviewCard } from '@/components/links/link-og-preview-card';
import { LinkQrCard } from '@/components/links/link-qr-card';
import { RequireApp } from '@/components/require-app';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatUrlWithoutProtocol,
  getLinkDisplayName,
  getPrimaryLinkUrl,
} from '@/lib/link-urls';
import { useLink, useLinkDomains } from '@/lib/queries';

export default function LinkDetailPage({
  params,
}: {
  params: Promise<{ linkId: string }>;
}) {
  const { linkId } = use(params);
  const router = useRouter();
  const [appId] = useQueryState('app', parseAsString);
  const { data: link, isPending } = useLink(appId ?? '', linkId);
  const { data: domainsData } = useLinkDomains(appId ?? '');

  const domains = domainsData?.domains ?? [];

  const primaryUrl = useMemo(() => {
    if (!link) {
      return null;
    }
    return getPrimaryLinkUrl(link.slug, link.domainIds, domains);
  }, [link, domains]);

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <div className="flex items-center justify-between gap-2">
          <Button
            className="font-normal"
            onClick={() => router.back()}
            size="sm"
            type="button"
            variant="outline"
          >
            <HugeiconsIcon className="size-4" icon={ArrowTurnBackwardIcon} />
            Back
          </Button>
          {link && appId ? (
            <EditLinkDialog appId={appId} linkId={linkId}>
              <Button size="sm" type="button" variant="outline">
                <HugeiconsIcon className="size-4" icon={Edit02Icon} />
                Edit
              </Button>
            </EditLinkDialog>
          ) : null}
        </div>

        {isPending || !link || !primaryUrl ? (
          <Skeleton className="h-12 w-64" />
        ) : (
          <DashboardPageHeader
            description={
              link.name?.trim()
                ? primaryUrl.display
                : formatUrlWithoutProtocol(link.destinationUrl)
            }
            title={getLinkDisplayName(link.name, primaryUrl.display)}
          />
        )}

        {link && appId && primaryUrl ? (
          <>
            <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
              <LinkInfoCard className="h-full" domains={domains} link={link} />
              <div className="grid gap-4 sm:grid-cols-2">
                <LinkOgPreviewCard className="h-full" link={link} />
                <LinkQrCard className="h-full" shortUrl={primaryUrl.url} />
              </div>
            </div>

            <LinkAnalytics appId={appId} linkId={linkId} />

            <LinkClicksTable appId={appId} linkId={linkId} />
          </>
        ) : null}
      </div>
    </RequireApp>
  );
}
