'use client';

import {
  AndroidIcon,
  AnonymousIcon,
  AppleIcon,
  BrowserIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { parseAsString, useQueryState } from 'nuqs';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDevicePlatformOverview } from '@/lib/queries';

function getPlatformIcon(platform: string) {
  switch (platform) {
    case 'android':
      return AndroidIcon;
    case 'ios':
      return AppleIcon;
    case 'web':
      return BrowserIcon;
    default:
      return AnonymousIcon;
  }
}

function getPlatformLabel(platform: string) {
  switch (platform) {
    case 'android':
      return 'Android';
    case 'ios':
      return 'iOS';
    case 'web':
      return 'Web';
    default:
      return 'Unknown';
  }
}

export function UsersPlatformDistribution() {
  const [appId] = useQueryState('app', parseAsString);
  const { data: overview } = useDevicePlatformOverview(appId || '');

  if (!appId) {
    return null;
  }

  const platformStats = (overview?.platformStats || {}) as Record<
    string,
    number
  >;
  const totalDevices = overview?.totalDevices || 0;

  const platforms = ['android', 'ios', 'web'] as const;
  const sortedPlatforms = [...platforms].sort((a, b) => {
    const countA = platformStats[a] || 0;
    const countB = platformStats[b] || 0;
    return countB - countA;
  });

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <Tabs value="platform">
          <TabsList className="h-8">
            <TabsTrigger className="text-xs" value="platform">
              <span className="sm:hidden">Platforms</span>
              <span className="hidden sm:inline">Platform Distribution</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-muted-foreground text-sm">
          User distribution across platforms
        </p>

        <div className="space-y-3">
          {sortedPlatforms.map((platform) => {
            const countNum = platformStats[platform] || 0;
            const percentage = totalDevices
              ? (countNum / totalDevices) * 100
              : 0;

            return (
              <div className="space-y-1.5" key={platform}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon
                      className="size-4 text-muted-foreground"
                      icon={getPlatformIcon(platform)}
                    />
                    <span className="font-medium text-sm">
                      {getPlatformLabel(platform)}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono font-semibold text-sm">
                      {countNum.toLocaleString()}
                    </span>
                    <span className="font-mono text-muted-foreground text-xs">
                      ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
