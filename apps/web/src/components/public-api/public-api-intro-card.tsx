import { InformationCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function PublicApiIntroCard() {
  return (
    <Card className="border-blue-500/50 bg-blue-500/5 py-0">
      <CardContent className="space-y-4 p-4">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
            <HugeiconsIcon
              className="size-5 text-blue-600 dark:text-blue-400"
              icon={InformationCircleIcon}
            />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Public Analytics API</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Create separate read-only tokens for external dashboards, scripts,
              and integrations. Public API tokens are distinct from your SDK API
              key: the SDK key sends analytics data, while Public API tokens
              read curated analytics reports.
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
