'use client';

import {
  ArrowTurnBackwardIcon,
  Edit02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { EditLinkDialog } from '@/components/links/edit-link-dialog';
import { useRouter } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import { use, useMemo } from 'react';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-page-header';
import { LinkAnalytics } from '@/components/links/link-analytics';
import { LinkInfoCard } from '@/components/links/link-info-card';
import { LinkQrCard } from '@/components/links/link-qr-card';
import { RequireApp } from '@/components/require-app';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatUrlWithoutProtocol,
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
            className="w-fit font-normal"
            onClick={() => router.back()}
            type="button"
            variant="outline"
          >
            <HugeiconsIcon icon={ArrowTurnBackwardIcon} />
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
            description={formatUrlWithoutProtocol(link.destinationUrl)}
            title={primaryUrl.display}
          />
        )}

        {link && appId && primaryUrl ? (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <LinkInfoCard domains={domains} link={link} />
              <LinkQrCard shortUrl={primaryUrl.url} />
            </div>

            <LinkAnalytics appId={appId} linkId={linkId} />
          </>
        ) : null}
      </div>
    </RequireApp>
  );
}
