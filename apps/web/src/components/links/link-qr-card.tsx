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
import { renderStyledLinkQrDataUrl } from '@/lib/link-qr-render';
import { cn } from '@/lib/utils';

const DISPLAY_QR_SIZE = 128;
const DISPLAY_PIXEL_RATIO = 3;
const EXPORT_QR_SIZE = 1024;

type LinkQrCardProps = {
  shortUrl: string;
  className?: string;
};

export function LinkQrCard({ shortUrl, className }: LinkQrCardProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    renderStyledLinkQrDataUrl(shortUrl, {
      width: DISPLAY_QR_SIZE,
      pixelRatio: DISPLAY_PIXEL_RATIO,
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [shortUrl]);

  const handleDownload = async () => {
    try {
      const exportUrl = await renderStyledLinkQrDataUrl(shortUrl, {
        width: EXPORT_QR_SIZE,
        pixelRatio: 1,
      });
      const link = document.createElement('a');
      link.href = exportUrl;
      link.download = 'phase-link-qr.png';
      link.click();
    } catch {
      // ignore
    }
  };

  return (
    <Card className={cn('flex h-full flex-col py-0', className)}>
      <CardContent className="flex flex-1 flex-col p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-muted-foreground text-sm uppercase">
            QR code
          </h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                disabled={!dataUrl}
                onClick={handleDownload}
                size="icon-sm"
                type="button"
                variant="outline"
              >
                <HugeiconsIcon className="size-4" icon={Download01Icon} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download PNG</TooltipContent>
          </Tooltip>
        </div>

        <div className="mt-2 flex flex-1 items-center justify-center rounded-lg bg-muted p-1.5 [background-image:linear-gradient(to_right,color-mix(in_oklab,var(--foreground)_10%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--foreground)_10%,transparent)_1px,transparent_1px)] [background-size:14px_14px]">
          {dataUrl ? (
            // biome-ignore lint/performance/noImgElement: dynamic data URL QR preview
            <img
              alt="Link QR code"
              className="aspect-square w-[min(100%,6.5rem)] rounded-md border border-border/60 bg-white shadow-sm"
              height={DISPLAY_QR_SIZE}
              src={dataUrl}
              style={{ imageRendering: 'auto' }}
              width={DISPLAY_QR_SIZE}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
