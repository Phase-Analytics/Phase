'use client';

import type { LinkDetail } from '@phase/shared';
import { Card, CardContent } from '@/components/ui/card';
import { resolveLinkOgPreviewContent } from '@/lib/link-og-preview-content';
import { cn } from '@/lib/utils';

type LinkOgPreviewCardProps = {
  link: LinkDetail;
  siteLabel: string;
  className?: string;
};

export function LinkOgPreviewCard({
  link,
  siteLabel,
  className,
}: LinkOgPreviewCardProps) {
  const preview = resolveLinkOgPreviewContent(link, siteLabel);

  return (
    <Card className={cn('flex min-h-0 flex-col py-0', className)}>
      <CardContent className="flex min-h-0 flex-1 flex-col p-4">
        <h2 className="shrink-0 font-semibold text-muted-foreground text-sm uppercase">
          Preview
        </h2>

        <div className="mt-3 flex min-h-0 flex-1 items-center justify-center">
          <div className="w-full max-w-sm overflow-hidden rounded-xl border bg-card shadow-[var(--shadow),var(--highlight)]">
            {preview.imageSrc ? (
              // biome-ignore lint/performance/noImgElement: external OG image URL
              <img
                alt=""
                className="aspect-[1200/630] w-full object-cover"
                height={315}
                src={preview.imageSrc}
                width={600}
              />
            ) : (
              <div className="flex aspect-[1200/630] w-full items-center justify-center bg-muted/80 [background-image:linear-gradient(135deg,color-mix(in_oklab,var(--foreground)_6%,transparent)_0%,transparent_50%,color-mix(in_oklab,var(--foreground)_4%,transparent)_100%)]">
                <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  No image
                </span>
              </div>
            )}

            <div className="space-y-1 border-t bg-muted/20 px-3 py-2.5">
              <p className="truncate text-[11px] text-muted-foreground uppercase tracking-wide">
                {preview.siteLabel}
              </p>
              <p className="line-clamp-2 font-semibold text-sm leading-snug">
                {preview.title}
              </p>
              <p className="line-clamp-2 text-muted-foreground text-xs leading-relaxed">
                {preview.description}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
