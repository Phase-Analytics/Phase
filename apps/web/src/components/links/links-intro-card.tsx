'use client';

import { Link01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

type LinksIntroCardProps = {
  appId: string;
};

export function LinksIntroCard({ appId }: LinksIntroCardProps) {
  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <HugeiconsIcon className="size-5 text-primary" icon={Link01Icon} />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Short links</h3>
            <p className="text-muted-foreground text-sm">
              Default URLs use phase.sh/l/your-slug. Attach custom domains
              under{' '}
              <Link
                className="font-medium text-foreground underline-offset-4 hover:underline"
                href={`/dashboard/links/domains?app=${appId}`}
              >
                Domains
              </Link>
              .
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
