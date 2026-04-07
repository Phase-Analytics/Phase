import { InformationCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
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
            <h3 className="font-semibold text-sm">Phase API</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Create separate read-only keys for external dashboards, scripts,
              and integrations. These keys are distinct from your SDK key: the
              SDK key sends analytics data, while API keys read curated
              analytics reports.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
