'use client';

import { InformationCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { CopyButton } from '@/components/ui/copy-button';
import { Card, CardContent } from '@/components/ui/card';

export const LINK_CNAME_TARGET = 'cname.phase.sh';

type LinkDnsSetupCardProps = {
  hostname: string;
};

export function LinkDnsSetupCard({ hostname }: LinkDnsSetupCardProps) {
  const recordName = hostname.split('.')[0] || hostname;

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
            <h3 className="font-semibold text-sm">DNS setup</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Add this CNAME at your DNS provider. Cloudflare proxy is fine.
              Propagation can take a few minutes.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-background/80">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-0 border-b px-3 py-2 text-xs">
            <span className="font-medium text-muted-foreground uppercase tracking-wide">
              Type
            </span>
            <span className="font-medium text-muted-foreground uppercase tracking-wide">
              Name
            </span>
            <span className="font-medium text-muted-foreground uppercase tracking-wide">
              Target
            </span>
          </div>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 px-3 py-3 font-mono text-sm">
            <span className="text-muted-foreground">CNAME</span>
            <span className="break-all">{recordName}</span>
            <div className="flex items-center gap-1 break-all">
              <span>{LINK_CNAME_TARGET}</span>
              <CopyButton content={LINK_CNAME_TARGET} size="xs" variant="ghost" />
            </div>
          </div>
        </div>

        <p className="text-muted-foreground text-xs">
          Full host: <span className="font-mono text-foreground">{hostname}</span>
        </p>
      </CardContent>
    </Card>
  );
}
