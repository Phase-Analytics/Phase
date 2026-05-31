'use client';

import type { LinkDetail } from '@phase/shared';
import { Card, CardContent } from '@/components/ui/card';
import { resolveLinkOgPreviewContent } from '@/lib/link-og-preview-content';

type LinkOgPreviewCardProps = {
  link: LinkDetail;
};

export function LinkOgPreviewCard({ link }: LinkOgPreviewCardProps) {
  const preview = resolveLinkOgPreviewContent(link);

  return (
    <Card className="py-0">
      <CardContent className="p-3">
        <h2 className="font-semibold text-muted-foreground text-sm uppercase">
          Preview
        </h2>

        <div className="mt-2 overflow-hidden rounded-lg border bg-card shadow-sm">
          {preview.imageSrc ? (
            // biome-ignore lint/performance/noImgElement: external OG image URL
            <img
              alt=""
              className="aspect-[1.91/1] max-h-20 w-full object-cover"
              height={80}
              src={preview.imageSrc}
              width={152}
            />
          ) : (
            <div className="flex aspect-[1.91/1] max-h-20 w-full items-center justify-center bg-muted/60">
              <span className="text-[10px] text-muted-foreground">
                No image
              </span>
            </div>
          )}

          <div className="space-y-0.5 border-t px-2 py-1.5">
            <p className="line-clamp-1 font-medium text-xs leading-snug">
              {preview.title}
            </p>
            <p className="line-clamp-2 text-[11px] text-muted-foreground leading-snug">
              {preview.description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
