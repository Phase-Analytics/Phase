'use client';

import { BrowserIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { LinkBrowserFamily } from '@phase/shared';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const BRANDED_BROWSERS = new Set<LinkBrowserFamily>([
  'chrome',
  'firefox',
  'safari',
]);

function resolveBrowserFamily(browser: string): LinkBrowserFamily | null {
  const key = browser.trim().toLowerCase();
  if (BRANDED_BROWSERS.has(key as LinkBrowserFamily)) {
    return key as LinkBrowserFamily;
  }
  return null;
}

type LinkBrowserIconProps = {
  browser: string;
  className?: string;
  size?: number;
};

export function LinkBrowserIcon({
  browser,
  className,
  size = 14,
}: LinkBrowserIconProps) {
  const family = resolveBrowserFamily(browser);

  if (family) {
    return (
      <Image
        alt=""
        className={cn('shrink-0', className)}
        height={size}
        src={`/svg/browsers/${family}.svg`}
        width={size}
      />
    );
  }

  return (
    <HugeiconsIcon
      className={cn('shrink-0 text-muted-foreground', className)}
      icon={BrowserIcon}
      size={size}
    />
  );
}
