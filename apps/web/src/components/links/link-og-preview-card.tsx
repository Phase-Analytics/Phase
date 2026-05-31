'use client';

import { Download01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  type LinkOgPreviewSource,
  resolveLinkOgPreviewContent,
} from '@/lib/link-og-preview-content';
import { renderStyledLinkQrDataUrl } from '@/lib/link-qr-render';
import { cn } from '@/lib/utils';

const DISPLAY_QR_SIZE = 128;
const DISPLAY_PIXEL_RATIO = 3;
const EXPORT_QR_SIZE = 1024;

type LinkOgPreviewCardProps = {
  link: LinkOgPreviewSource;
  shortUrl?: string;
  imageOverride?: string;
  variant?: 'card' | 'inline';
  className?: string;
};

export function LinkOgPreviewCard({
  link,
  shortUrl,
  imageOverride,
  variant = 'card',
  className,
}: LinkOgPreviewCardProps) {
  const preview = resolveLinkOgPreviewContent(link);
  const imageSrc = imageOverride ?? preview.imageSrc;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!shortUrl) {
      setQrDataUrl(null);
      return;
    }

    renderStyledLinkQrDataUrl(shortUrl, {
      width: DISPLAY_QR_SIZE,
      pixelRatio: DISPLAY_PIXEL_RATIO,
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [shortUrl]);

  const handleDownloadQr = async () => {
    if (!shortUrl) {
      return;
    }

    try {
      const exportUrl = await renderStyledLinkQrDataUrl(shortUrl, {
        width: EXPORT_QR_SIZE,
        pixelRatio: 1,
      });
      const anchor = document.createElement('a');
      anchor.href = exportUrl;
      anchor.download = 'phase-link-qr.png';
      anchor.click();
    } catch {
      // ignore
    }
  };

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
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-muted-foreground text-sm uppercase">
            Preview
          </h2>
          {shortUrl ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  disabled={!qrDataUrl}
                  onClick={handleDownloadQr}
                  size="icon-sm"
                  type="button"
                  variant="outline"
                >
                  <HugeiconsIcon className="size-4" icon={Download01Icon} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download QR PNG</TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        <div
          className={cn(
            'mt-2 flex flex-1 gap-4',
            shortUrl
              ? 'flex-col items-center sm:flex-row sm:items-center sm:justify-between'
              : 'items-center justify-center'
          )}
        >
          <div className={cn('min-w-0', shortUrl ? 'flex-1' : '')}>
            {previewCard}
          </div>

          {shortUrl ? (
            <div className="flex shrink-0 flex-col items-center gap-2">
              <div className="flex items-center justify-center rounded-lg bg-muted p-1.5 [background-image:linear-gradient(to_right,color-mix(in_oklab,var(--foreground)_10%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--foreground)_10%,transparent)_1px,transparent_1px)] [background-size:14px_14px]">
                {qrDataUrl ? (
                  // biome-ignore lint/performance/noImgElement: dynamic data URL QR preview
                  <img
                    alt="Link QR code"
                    className="aspect-square w-[min(100%,6.5rem)] rounded-md border border-border/60 bg-white shadow-sm"
                    height={DISPLAY_QR_SIZE}
                    src={qrDataUrl}
                    style={{ imageRendering: 'auto' }}
                    width={DISPLAY_QR_SIZE}
                  />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
