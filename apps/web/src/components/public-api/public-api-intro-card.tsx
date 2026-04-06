import { InformationCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function PublicApiIntroCard() {
  return (
    <Card className="border-indigo-500/40 bg-indigo-500/5 py-0">
      <CardContent className="space-y-4 p-4">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
            <HugeiconsIcon
              className="size-5 text-indigo-600 dark:text-indigo-400"
              icon={InformationCircleIcon}
            />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Public Analytics API</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Create separate read-only tokens for external dashboards, scripts,
              and integrations. Public API tokens are distinct from your SDK API
              key: the SDK key sends analytics data, while Public API tokens
              read curated reports and capability metadata.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-background/60 p-3">
            <p className="font-medium text-sm">Current MVP surface</p>
            <p className="mt-1 text-muted-foreground text-sm">
              Capabilities discovery plus curated event, session, and device
              reports.
            </p>
          </div>
          <div className="rounded-lg border bg-background/60 p-3">
            <p className="font-medium text-sm">
              What is intentionally not here
            </p>
            <p className="mt-1 text-muted-foreground text-sm">
              No GA-style freeform query builder, no funnel/retention reports,
              and no event parameter breakdowns yet.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/docs/public-api/overview" target="_blank">
              Read Public API docs
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
