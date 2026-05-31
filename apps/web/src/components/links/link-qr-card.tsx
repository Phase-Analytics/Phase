'use client';

import { Download01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const DISPLAY_QR_SIZE = 128;
const EXPORT_QR_SIZE = 512;

const QR_OPTIONS = {
  margin: 2,
  errorCorrectionLevel: 'Q' as const,
};

type LinkQrCardProps = {
  shortUrl: string;
};

export function LinkQrCard({ shortUrl }: LinkQrCardProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(shortUrl, {
      ...QR_OPTIONS,
      width: DISPLAY_QR_SIZE,
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [shortUrl]);

  const handleDownload = async () => {
    try {
      const exportUrl = await QRCode.toDataURL(shortUrl, {
        ...QR_OPTIONS,
        width: EXPORT_QR_SIZE,
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
    <Card className="flex h-full flex-col py-0">
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
          className="mt-4 flex min-h-0 flex-1 items-center justify-center rounded-lg bg-muted [background-image:linear-gradient(to_right,color-mix(in_oklab,var(--foreground)_10%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--foreground)_10%,transparent)_1px,transparent_1px)] [background-size:20px_20px]"
        >
          {dataUrl ? (
            // biome-ignore lint/performance/noImgElement: dynamic data URL QR preview
            <img
              alt="Link QR code"
              className="size-32 rounded-md border border-border/60 bg-white p-2 shadow-sm"
              height={DISPLAY_QR_SIZE}
              src={dataUrl}
              width={DISPLAY_QR_SIZE}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
