'use client';

import {
  formatZodError,
  LinkSlugSchema,
  UpdatePolicyRequestSchema,
} from '@phase/shared';
import { useParams, useRouter } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-page-header';
import { LinkAnalytics } from '@/components/links/link-analytics';
import { LinkClicksTable } from '@/components/links/link-clicks-table';
import { PHASE_HOST_VALUE } from '@/components/links/link-form-utils';
import { LinkQrCard } from '@/components/links/link-qr-card';
import { MarkdownContent } from '@/components/policies/markdown-content';
import { RemovePolicyDialog } from '@/components/policies/remove-policy-dialog';
import { RequireApp } from '@/components/require-app';
import { BuilderDropdown } from '@/components/ui/builder-dropdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { formatApiErrorMessage } from '@/lib/format-api-error';
import {
  useLinkDomains,
  usePolicy,
  usePolicySlugAvailable,
  useUpdatePolicy,
} from '@/lib/queries';

export default function PolicyDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const policyId = params.id;
  const [appId] = useQueryState('app', parseAsString);

  const { data, isPending, isError } = usePolicy(appId ?? '', policyId);
  const { data: domainsData } = useLinkDomains(appId ?? '');
  const updatePolicy = useUpdatePolicy(appId ?? '', policyId);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [hostValue, setHostValue] = useState(PHASE_HOST_VALUE);
  const [date, setDate] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!data) {
      return;
    }
    setName(data.name);
    setSlug(data.slug);
    setHostValue(data.domainId ?? PHASE_HOST_VALUE);
    setDate(data.date);
    setContent(data.content);
  }, [data]);

  const verifiedDomains = useMemo(
    () =>
      domainsData?.domains.filter(
        (domain) => domain.status === 'verified' || domain.id === data?.domainId
      ) ?? [],
    [domainsData?.domains, data?.domainId]
  );

  const hostOptions = useMemo(
    () => [
      { value: PHASE_HOST_VALUE, label: 'phase.sh' },
      ...verifiedDomains.map((domain) => ({
        value: domain.id,
        label: domain.hostname,
      })),
    ],
    [verifiedDomains]
  );

  const selectedDomainId = hostValue === PHASE_HOST_VALUE ? null : hostValue;
  const slugPrefix = hostValue === PHASE_HOST_VALUE ? '/l/' : '/';

  const slugChanged = data ? slug !== data.slug : false;
  const scopeChanged = data ? selectedDomainId !== data.domainId : false;

  const slugCheck = usePolicySlugAvailable({
    appId: appId ?? '',
    slug,
    domainId: selectedDomainId,
    enabled:
      Boolean(appId) && slug.length >= 3 && (slugChanged || scopeChanged),
    excludePolicyId: policyId,
  });

  const slugValidationError = useMemo(() => {
    if (!slug) {
      return null;
    }
    const parsed = LinkSlugSchema.safeParse(slug);
    if (!parsed.success) {
      return formatZodError(parsed.error);
    }
    return null;
  }, [slug]);

  const slugTaken =
    (slugChanged || scopeChanged) &&
    slug.length >= 3 &&
    slugCheck.data &&
    !slugCheck.data.available;

  const handleSave = async () => {
    setError(null);

    const payload = {
      name: name.trim(),
      slug: slug.toLowerCase().trim(),
      domainId: selectedDomainId,
      date,
      content,
    };

    const parsed = UpdatePolicyRequestSchema.safeParse(payload);
    if (!parsed.success) {
      setError(formatZodError(parsed.error));
      return;
    }

    if (slugTaken) {
      setError('This path is already taken on the selected domain');
      return;
    }

    try {
      await updatePolicy.mutateAsync(parsed.data);
      toast.success('Policy saved');
    } catch (err) {
      setError(formatApiErrorMessage(err));
    }
  };

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <DashboardPageHeader
          description="Edit content and short link. Clicks are tracked automatically."
          title={data?.name ?? 'Policy'}
        />

        {isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : null}

        {isError || !(isPending || data) ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              Policy not found
            </CardContent>
          </Card>
        ) : null}

        {data && appId ? (
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <Card className="py-0">
                <CardContent className="space-y-4 p-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-medium text-sm" htmlFor="edit-name">
                      Name
                    </label>
                    <Input
                      id="edit-name"
                      onChange={(e) => setName(e.target.value)}
                      value={name}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-medium text-sm" htmlFor="edit-slug">
                      Link
                    </label>
                    <div className="flex gap-2">
                      <BuilderDropdown
                        className="h-9 w-[min(42%,11rem)] shrink-0"
                        onValueChange={setHostValue}
                        options={hostOptions}
                        value={hostValue}
                      />
                      <div className="flex min-w-0 flex-1 items-center gap-0">
                        <span className="flex h-9 shrink-0 items-center rounded-l-md border border-r-0 bg-muted/50 px-2 font-mono text-muted-foreground text-xs">
                          {slugPrefix}
                        </span>
                        <Input
                          className="rounded-l-none"
                          id="edit-slug"
                          onChange={(e) =>
                            setSlug(
                              e.target.value.toLowerCase().replace(/\s+/g, '-')
                            )
                          }
                          value={slug}
                        />
                      </div>
                      <CopyButton
                        content={data.publicUrl}
                        size="xs"
                        variant="outline"
                      />
                    </div>
                    {slugValidationError ? (
                      <p className="text-destructive text-xs">
                        {slugValidationError}
                      </p>
                    ) : null}
                    {slugTaken ? (
                      <p className="text-destructive text-xs">
                        This path is already taken on the selected domain
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-medium text-sm" htmlFor="edit-date">
                      Date
                    </label>
                    <Input
                      id="edit-date"
                      onChange={(e) => setDate(e.target.value)}
                      type="date"
                      value={date}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        className="font-medium text-sm"
                        htmlFor="edit-content"
                      >
                        Content
                      </label>
                      <Button
                        onClick={() => setShowPreview((v) => !v)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        {showPreview ? 'Edit' : 'Preview'}
                      </Button>
                    </div>
                    {showPreview ? (
                      <div className="min-h-64 rounded-md border p-4">
                        <MarkdownContent content={content} />
                      </div>
                    ) : (
                      <textarea
                        className="min-h-64 w-full rounded-md border bg-transparent px-3 py-2 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        id="edit-content"
                        onChange={(e) => setContent(e.target.value)}
                        value={content}
                      />
                    )}
                  </div>

                  {error ? (
                    <p className="text-destructive text-sm">{error}</p>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <RemovePolicyDialog
                      appId={appId}
                      onDeleted={() =>
                        router.push(`/dashboard/policies?app=${appId}`)
                      }
                      policyId={policyId}
                      policyLabel={data.name}
                    >
                      <Button type="button" variant="destructive">
                        Delete
                      </Button>
                    </RemovePolicyDialog>

                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          router.push(`/dashboard/policies?app=${appId}`)
                        }
                        type="button"
                        variant="outline"
                      >
                        Back
                      </Button>
                      <Button
                        className="relative"
                        disabled={
                          updatePolicy.isPending ||
                          Boolean(slugValidationError) ||
                          Boolean(slugTaken)
                        }
                        onClick={handleSave}
                        type="button"
                      >
                        {updatePolicy.isPending ? (
                          <Spinner className="size-4" />
                        ) : null}
                        Save
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <LinkQrCard className="h-fit" shortUrl={data.publicUrl} />
            </div>

            <LinkAnalytics appId={appId} linkId={data.linkId} />
            <LinkClicksTable appId={appId} linkId={data.linkId} />
          </div>
        ) : null}
      </div>
    </RequireApp>
  );
}
