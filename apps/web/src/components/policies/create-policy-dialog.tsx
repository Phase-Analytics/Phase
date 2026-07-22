'use client';

import {
  CreatePolicyRequestSchema,
  formatZodError,
  LinkSlugSchema,
} from '@phase/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PHASE_HOST_VALUE } from '@/components/links/link-form-utils';
import { BuilderDropdown } from '@/components/ui/builder-dropdown';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { formatApiErrorMessage } from '@/lib/format-api-error';
import {
  useCreatePolicy,
  useLinkDomains,
  usePolicySlugAvailable,
} from '@/lib/queries';

type CreatePolicyDialogProps = {
  appId: string;
  children: React.ReactNode;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CreatePolicyDialog({
  appId,
  children,
}: CreatePolicyDialogProps) {
  const router = useRouter();
  const createPolicy = useCreatePolicy();
  const { data: domainsData } = useLinkDomains(appId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [hostValue, setHostValue] = useState(PHASE_HOST_VALUE);
  const [date, setDate] = useState(todayIsoDate);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const verifiedDomains = useMemo(
    () => domainsData?.domains.filter((d) => d.status === 'verified') ?? [],
    [domainsData?.domains]
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

  const slugCheck = usePolicySlugAvailable({
    appId,
    slug,
    domainId: selectedDomainId,
    enabled: open && slug.length >= 3,
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
    slug.length >= 3 && slugCheck.data && !slugCheck.data.available;

  useEffect(() => {
    if (!open) {
      setName('');
      setSlug('');
      setHostValue(PHASE_HOST_VALUE);
      setDate(todayIsoDate());
      setContent('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    setError(null);

    const payload = {
      appId,
      name: name.trim(),
      slug: slug.toLowerCase().trim(),
      domainId: selectedDomainId,
      date,
      content,
    };

    const parsed = CreatePolicyRequestSchema.safeParse(payload);
    if (!parsed.success) {
      setError(formatZodError(parsed.error));
      return;
    }

    if (slugTaken) {
      setError('This path is already taken on the selected domain');
      return;
    }

    try {
      const created = await createPolicy.mutateAsync(parsed.data);
      setOpen(false);
      router.push(`/dashboard/policies/${created.id}?app=${appId}`);
    } catch (err) {
      setError(formatApiErrorMessage(err));
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create policy</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-sm" htmlFor="policy-name">
              Name
            </label>
            <Input
              id="policy-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="Privacy Policy"
              value={name}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-sm" htmlFor="policy-slug">
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
                <span className="flex h-9 shrink-0 items-center rounded-l-md border border-r-0 bg-muted/50 px-2 text-muted-foreground text-xs">
                  {slugPrefix}
                </span>
                <Input
                  className="rounded-l-none"
                  id="policy-slug"
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))
                  }
                  placeholder="arrowflow-privacy"
                  value={slug}
                />
              </div>
            </div>
            {slugValidationError ? (
              <p className="text-destructive text-xs">{slugValidationError}</p>
            ) : null}
            {slugTaken ? (
              <p className="text-destructive text-xs">
                This path is already taken on the selected domain
              </p>
            ) : null}
            {slug.length >= 3 &&
            !slugValidationError &&
            slugCheck.data?.available ? (
              <p className="text-muted-foreground text-xs">Path is available</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-sm" htmlFor="policy-date">
              Date
            </label>
            <Input
              id="policy-date"
              onChange={(e) => setDate(e.target.value)}
              type="date"
              value={date}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-sm" htmlFor="policy-content">
              Content
            </label>
            <textarea
              className="min-h-40 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              id="policy-content"
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your policy in Markdown…"
              value={content}
            />
          </div>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            disabled={createPolicy.isPending}
            onClick={() => setOpen(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className="relative"
            disabled={
              createPolicy.isPending ||
              Boolean(slugValidationError) ||
              Boolean(slugTaken)
            }
            onClick={handleSubmit}
            type="button"
          >
            {createPolicy.isPending ? <Spinner className="size-4" /> : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
