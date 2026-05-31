'use client';

import {
  AndroidIcon,
  AnonymousIcon,
  AppleFinderIcon,
  AppleIcon,
  BrowserIcon,
  CommandIcon,
  Flag02Icon,
  WindowsOldIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import Image from 'next/image';
import 'flag-icons/css/flag-icons.min.css';
import { Card, CardContent } from '@/components/ui/card';

const COUNTRY_CODE_REGEX = /^[A-Za-z]{2}$/;

type BreakdownItem = {
  key: string;
  count: number;
};

function getCountryLabel(countryCode: string) {
  if (!(countryCode && COUNTRY_CODE_REGEX.test(countryCode))) {
    return 'Unknown';
  }

  return (
    new Intl.DisplayNames(['en'], { type: 'region' }).of(
      countryCode.toUpperCase()
    ) || countryCode
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
): 'safari' | 'chrome' | 'firefox' | 'other' {
  const lower = key.toLowerCase();
  if (lower === 'webkit' || lower === 'safari') {
    return 'safari';
  }
  if (lower.includes('chrome') || lower.includes('chromium')) {
    return 'chrome';
  }
  if (lower.includes('firefox')) {
    return 'firefox';
  }
  return 'other';
}

function mergeBrowserItems(items: BreakdownItem[]): BreakdownItem[] {
  const merged = new Map<string, number>();

  for (const item of items) {
    const bucket = normalizeBrowserKey(item.key);
    merged.set(bucket, (merged.get(bucket) ?? 0) + item.count);
  }

  const order = ['safari', 'chrome', 'firefox', 'other'] as const;
  return order
    .filter((key) => (merged.get(key) ?? 0) > 0)
    .map((key) => ({
      key,
      count: merged.get(key) ?? 0,
    }));
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

function BrowserIconMark({ browser }: { browser: string }) {
  if (browser === 'other') {
    return (
      <HugeiconsIcon
        className="size-4 text-muted-foreground"
        icon={BrowserIcon}
      />
    );
  }

  return (
    <Image
      alt=""
      className="size-4 shrink-0"
      height={16}
      src={`/svg/browsers/${browser}.svg`}
      width={16}
    />
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

function CountryRow({
  countryCode,
  count,
}: {
  countryCode: string;
  count: number;
}) {
  const isValid =
    countryCode.length === 2 && COUNTRY_CODE_REGEX.test(countryCode);

  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <div className="flex min-w-0 items-center gap-1.5">
        {isValid ? (
          <span
            className={`fi fi-${countryCode.toLowerCase()} rounded-xs text-[14px]`}
            title={getCountryLabel(countryCode)}
          />
        ) : (
          <HugeiconsIcon
            className="size-3.5 shrink-0 text-muted-foreground"
            icon={Flag02Icon}
          />
        )}
        <span className="truncate">{getCountryLabel(countryCode)}</span>
      </div>
      <span className="shrink-0 font-medium tabular-nums">{count}</span>
    </li>
  );
}

function IconRow({
  icon,
  label,
  count,
}: {
  icon: IconSvgElement;
  label: string;
  count: number;
}) {
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <HugeiconsIcon
          className="size-4 shrink-0 text-muted-foreground"
          icon={icon}
        />
        <span className="truncate">{label}</span>
      </div>
      <span className="shrink-0 font-medium tabular-nums">{count}</span>
    </li>
  );
}

export function LinkAnalyticsBreakdownCard({
  title,
  variant,
  items,
}: {
  title: string;
  variant: 'countries' | 'operatingSystems' | 'browsers' | 'referrers';
  items: BreakdownItem[];
}) {
  const displayItems =
    variant === 'browsers'
      ? mergeBrowserItems(items)
      : variant === 'referrers'
        ? mergeReferrerItems(items)
        : items;

  return (
    <Card className="py-0">
      <CardContent className="space-y-3 p-4">
        <h3 className="font-semibold text-muted-foreground text-sm uppercase">
          {title}
        </h3>
        {displayItems.length === 0 ? (
          <p className="text-muted-foreground text-sm">No data yet</p>
        ) : (
          <ul className="space-y-2">
            {variant === 'countries' &&
              displayItems.map((item) => (
                <CountryRow
                  count={item.count}
                  countryCode={item.key}
                  key={`country-${item.key}`}
                />
              ))}
            {variant === 'operatingSystems' &&
              displayItems.map((item) => (
                <IconRow
                  count={item.count}
                  icon={getOsIcon(item.key)}
                  key={`os-${item.key}`}
                  label={getOsLabel(item.key)}
                />
              ))}
            {variant === 'browsers' &&
              displayItems.map((item) => (
                <li
                  className="flex items-center justify-between gap-2 text-sm"
                  key={`browser-${item.key}`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <BrowserIconMark browser={item.key} />
                    <span className="truncate">
                      {getBrowserLabel(item.key)}
                    </span>
                  </div>
                  <span className="shrink-0 font-medium tabular-nums">
                    {item.count}
                  </span>
                </li>
              ))}
            {variant === 'referrers' &&
              displayItems.map((item) => (
                <li
                  className="flex items-center justify-between gap-2 text-sm"
                  key={`referrer-${item.key}`}
                >
                  <span className="truncate">{getReferrerLabel(item.key)}</span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {item.count}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
