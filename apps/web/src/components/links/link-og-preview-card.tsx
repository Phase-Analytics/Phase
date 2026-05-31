'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  type LinkOgPreviewSource,
  resolveLinkOgPreviewContent,
} from '@/lib/link-og-preview-content';
import { cn } from '@/lib/utils';

type LinkOgPreviewCardProps = {
  link: LinkOgPreviewSource;
  imageOverride?: string;
  variant?: 'card' | 'inline';
  className?: string;
};

export function LinkOgPreviewCard({
  link,
  imageOverride,
  variant = 'card',
  className,
}: LinkOgPreviewCardProps) {
  const preview = resolveLinkOgPreviewContent(link);
  const imageSrc = imageOverride ?? preview.imageSrc;

  const previewCard = (
    <div
      className={cn(
        'overflow-hidden rounded-lg border bg-card shadow-sm',
        variant === 'card' ? 'w-full max-w-xs' : 'w-full'
      )}
    >
      {imageSrc ? (
        // biome-ignore lint/performance/noImgElement: external OG image URL
        <img
          alt=""
          className={cn(
            'aspect-[1.91/1] w-full object-cover',
            variant === 'card' ? 'max-h-28' : 'max-h-32'
          )}
          height={variant === 'card' ? 112 : 128}
          src={imageSrc}
          width={variant === 'card' ? 214 : 244}
        />
      ) : (
        <div
          className={cn(
            'flex aspect-[1.91/1] w-full items-center justify-center bg-muted/60',
            variant === 'card' ? 'max-h-28' : 'max-h-32'
          )}
        >
          <span className="text-[10px] text-muted-foreground">No image</span>
        </div>
      )}

      <div className="space-y-0.5 border-t px-2.5 py-2">
        <p className="line-clamp-1 font-medium text-sm leading-snug">
          {preview.title}
        </p>
        <p className="line-clamp-2 text-muted-foreground text-xs leading-snug">
          {preview.description}
        </p>
      </div>
    </div>
  );

  if (variant === 'inline') {
    return <div className={className}>{previewCard}</div>;
  }

  return (
    <Card className={cn('flex h-full flex-col py-0', className)}>
      <CardContent className="flex flex-1 flex-col p-3">
        <h2 className="font-semibold text-muted-foreground text-sm uppercase">
          Preview
        </h2>
        <div className="mt-2 flex flex-1 items-center justify-center">
          {previewCard}
        </div>
      </CardContent>
    </Card>
  );
}
