'use client';

import { GlobalIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Card, CardContent } from '@/components/ui/card';
import { LINK_CNAME_TARGET } from '@/components/links/link-dns-setup-card';

export function DomainsIntroCard() {
  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <HugeiconsIcon className="size-5 text-primary" icon={GlobalIcon} />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Custom domains</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Serve short links on your own hostname. Each domain needs one
              CNAME pointing to {LINK_CNAME_TARGET}.
            </p>
          </div>
        </div>
        <ol className="list-decimal space-y-2 pl-5 text-muted-foreground text-sm">
          <li>Add the hostname you control (e.g. go.company.com)</li>
          <li>Create the CNAME record at your DNS provider</li>
          <li>Click Verify once DNS has propagated</li>
        </ol>
      </CardContent>
    </Card>
  );
}
