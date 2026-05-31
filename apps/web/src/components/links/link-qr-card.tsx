'use client';

import { Download01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type LinkQrCardProps = {
  shortUrl: string;
};

export function LinkQrCard({ shortUrl }: LinkQrCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [qrSize, setQrSize] = useState(256);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      const width = element.clientWidth;
      if (width > 0) {
        setQrSize(Math.max(160, Math.min(width, 512)));
      }
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    QRCode.toDataURL(shortUrl, {
      width: qrSize,
      margin: 2,
      errorCorrectionLevel: 'Q',
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [shortUrl, qrSize]);

  const handleDownload = () => {
    if (!dataUrl) {
      return;
    }

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'phase-link-qr.png';
    link.click();
  };

  return (
    <Card className="flex h-full min-h-[280px] flex-col py-0">
      <CardContent className="flex min-h-0 flex-1 flex-col p-4">
        <div className="flex shrink-0 items-center justify-between gap-2">
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

        <div
          className="flex min-h-0 flex-1 items-center justify-center pt-4"
          ref={containerRef}
        >
          {dataUrl ? (
            // biome-ignore lint/performance/noImgElement: dynamic data URL QR preview
            <img
              alt="Link QR code"
              className="aspect-square h-auto w-full max-w-full rounded-lg border bg-white object-contain p-2"
              src={dataUrl}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
