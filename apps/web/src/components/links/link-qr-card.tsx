'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type LinkQrCardProps = {
  shortUrl: string;
};

export function LinkQrCard({ shortUrl }: LinkQrCardProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(shortUrl, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'Q',
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [shortUrl]);

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
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <h2 className="font-semibold text-muted-foreground text-sm uppercase">
          QR code
        </h2>
        {dataUrl ? (
          // biome-ignore lint/performance/noImgElement: dynamic data URL QR preview
          <img
            alt="Link QR code"
            className="mx-auto size-48 rounded-lg border bg-white p-2"
            height={192}
            src={dataUrl}
            width={192}
          />
        ) : null}
        <Button className="w-full" onClick={handleDownload} variant="outline">
          Download PNG
        </Button>
      </CardContent>
    </Card>
  );
}
