'use client';

import {
  AndroidIcon,
  AnonymousIcon,
  AppleFinderIcon,
  AppleIcon,
  BrowserIcon,
  CommandIcon,
  Link05Icon,
  WindowsOldIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { normalizeLinkBrowserFamily } from '@phase/shared';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

type BreakdownItem = {
  key: string;
  count: number;
};

function BreakdownBarRow({
  label,
  count,
  total,
  ariaLabel,
}: {
  label: ReactNode;
  count: number;
  total: number;
  ariaLabel: string;
}) {
  const percentage = total ? (count / total) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">{label}</div>
        <div className="flex shrink-0 items-baseline gap-2">
          <span className="font-semibold text-sm">
            {count.toLocaleString()}
          </span>
          <span className="text-muted-foreground text-xs">
            ({percentage.toFixed(1)}%)
          </span>
        </div>
      </div>
      <div
        aria-label={ariaLabel}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percentage}
        className="h-2 w-full overflow-hidden rounded-full bg-secondary"
        role="progressbar"
      >
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function normalizeOsKey(key: string): string {
  const lower = key.toLowerCase();
  if (!key || lower === 'unknown') {
    return 'unknown';
  }
  if (lower.includes('windows')) {
    return 'windows';
  }
  if (lower === 'ios' || lower.includes('iphone') || lower.includes('ipad')) {
    return 'ios';
  }
  if (lower.includes('android')) {
    return 'android';
  }
  if (lower.includes('mac') || lower.includes('os x')) {
    return 'macos';
  }
  if (lower.includes('linux')) {
    return 'linux';
  }
  return lower;
}

function getOsLabel(key: string): string {
  switch (normalizeOsKey(key)) {
    case 'windows':
      return 'Windows';
    case 'macos':
      return 'macOS';
    case 'android':
      return 'Android';
    case 'ios':
      return 'iOS';
    case 'linux':
      return 'Linux';
    case 'unknown':
      return 'Unknown';
    default:
      return key;
  }
}

function getOsIcon(key: string): IconSvgElement {
  switch (normalizeOsKey(key)) {
    case 'windows':
      return WindowsOldIcon;
    case 'macos':
      return AppleFinderIcon;
    case 'android':
      return AndroidIcon;
    case 'ios':
      return AppleIcon;
    case 'linux':
      return CommandIcon;
    default:
      return AnonymousIcon;
  }
}

function normalizeBrowserKey(
  key: string
): 'safari' | 'chrome' | 'firefox' | 'other' | 'unknown' {
  const normalized = normalizeLinkBrowserFamily(key);
  if (
    normalized === 'safari' ||
    normalized === 'chrome' ||
    normalized === 'firefox' ||
    normalized === 'other'
  ) {
    return normalized;
  }
  return 'other';
}

function mergeBrowserItems(items: BreakdownItem[]): BreakdownItem[] {
  const merged = new Map<string, number>();

  for (const item of items) {
    const bucket = normalizeBrowserKey(item.key);
    merged.set(bucket, (merged.get(bucket) ?? 0) + item.count);
  }

  return [...merged.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

function getBrowserLabel(key: string): string {
  switch (key) {
    case 'safari':
      return 'Safari';
    case 'chrome':
      return 'Chrome';
    case 'firefox':
      return 'Firefox';
    default:
      return 'Others';
  }
}

function BrowserLabel({ browser }: { browser: string }) {
  if (browser === 'other') {
    return (
      <>
        <HugeiconsIcon
          className="size-4 shrink-0 text-muted-foreground"
          icon={BrowserIcon}
        />
        <span className="truncate font-medium text-sm">Others</span>
      </>
    );
  }

  return (
    <>
      <Image
        alt=""
        className="size-4 shrink-0"
        height={16}
        src={`/svg/browsers/${browser}.svg`}
        width={16}
      />
      <span className="truncate font-medium text-sm">
        {getBrowserLabel(browser)}
      </span>
    </>
  );
}

function normalizeReferrerKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) {
    return 'direct';
  }

  const lower = trimmed.toLowerCase();
  if (lower === 'direct' || lower === '(direct)' || lower === 'null') {
    return 'direct';
  }

  return trimmed;
}

function mergeReferrerItems(items: BreakdownItem[]): BreakdownItem[] {
  const merged = new Map<string, number>();

  for (const item of items) {
    const bucket = normalizeReferrerKey(item.key);
    merged.set(bucket, (merged.get(bucket) ?? 0) + item.count);
  }

  return [...merged.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

function getReferrerLabel(key: string): string {
  if (normalizeReferrerKey(key) === 'direct') {
    return 'Direct';
  }

  return key;
}

export function LinkAnalyticsBreakdownCard({
  title,
  variant,
  items,
}: {
  title: string;
  variant: 'operatingSystems' | 'browsers' | 'referrers';
  items: BreakdownItem[];
}) {
  let displayItems = items;
  if (variant === 'browsers') {
    displayItems = mergeBrowserItems(items);
  } else if (variant === 'referrers') {
    displayItems = mergeReferrerItems(items);
  }

  const total = displayItems.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="py-0">
      <CardContent className="space-y-3 p-4">
        <h3 className="font-semibold text-muted-foreground text-sm uppercase">
          {title}
        </h3>
        {displayItems.length === 0 ? (
          <p className="text-muted-foreground text-sm">No data yet</p>
        ) : (
          <ScrollArea className="h-[220px]">
            <div className="space-y-3 pr-4">
              {variant === 'operatingSystems' &&
                displayItems.map((item) => {
                  const label = getOsLabel(item.key);
                  const percentage = total ? (item.count / total) * 100 : 0;

                  return (
                    <BreakdownBarRow
                      ariaLabel={`${label}: ${percentage.toFixed(1)}% of clicks`}
                      count={item.count}
                      key={`os-${item.key}`}
                      label={
                        <>
                          <HugeiconsIcon
                            className="size-4 shrink-0 text-muted-foreground"
                            icon={getOsIcon(item.key)}
                          />
                          <span className="truncate font-medium text-sm">
                            {label}
                          </span>
                        </>
                      }
                      total={total}
                    />
                  );
                })}

              {variant === 'browsers' &&
                displayItems.map((item) => {
                  const label = getBrowserLabel(item.key);
                  const percentage = total ? (item.count / total) * 100 : 0;

                  return (
                    <BreakdownBarRow
                      ariaLabel={`${label}: ${percentage.toFixed(1)}% of clicks`}
                      count={item.count}
                      key={`browser-${item.key}`}
                      label={<BrowserLabel browser={item.key} />}
                      total={total}
                    />
                  );
                })}

              {variant === 'referrers' &&
                displayItems.map((item) => {
                  const label = getReferrerLabel(item.key);
                  const percentage = total ? (item.count / total) * 100 : 0;

                  return (
                    <BreakdownBarRow
                      ariaLabel={`${label}: ${percentage.toFixed(1)}% of clicks`}
                      count={item.count}
                      key={`referrer-${item.key}`}
                      label={
                        <>
                          <HugeiconsIcon
                            className="size-4 shrink-0 text-muted-foreground"
                            icon={Link05Icon}
                          />
                          <span className="truncate font-medium text-sm">
                            {label}
                          </span>
                        </>
                      }
                      total={total}
                    />
                  );
                })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
