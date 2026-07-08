'use client';

import { AndroidIcon, AppleIcon, Flag02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { parseAsString, useQueryState } from 'nuqs';
import { useMemo, useState } from 'react';
import 'flag-icons/css/flag-icons.min.css';
import { PieCenter } from '@/components/charts/pie-center';
import { PieChart } from '@/components/charts/pie-chart';
import type { PieData } from '@/components/charts/pie-context';
import { PieSlice } from '@/components/charts/pie-slice';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDeviceOverviewResponse } from '@/lib/queries';

const COUNTRY_CODE_REGEX = /^[A-Za-z]{2}$/;
const TOP_COUNTRIES = 6;

const PIE_COLORS = [
  'var(--chart-1)',
  'oklch(0.62 0.14 165)',
  'oklch(0.72 0.14 55)',
  'oklch(0.58 0.16 310)',
  'oklch(0.65 0.14 25)',
  'oklch(0.55 0.08 230)',
  'var(--muted-foreground)',
] as const;

const PLATFORM_COLORS: Record<string, string> = {
  ios: 'var(--chart-1)',
  android: 'oklch(0.62 0.14 165)',
};

function getPlatformIcon(platform: string) {
  switch (platform) {
    case 'android':
      return AndroidIcon;
    case 'ios':
      return AppleIcon;
    default:
      return AppleIcon;
  }
}

function getPlatformLabel(platform: string) {
  switch (platform) {
    case 'android':
      return 'Android';
    case 'ios':
      return 'iOS';
    default:
      return platform;
  }
}

function getCountryLabel(countryCode: string) {
  if (countryCode === 'others') {
    return 'Others';
  }
  return (
    new Intl.DisplayNames(['en'], {
      type: 'region',
    }).of(countryCode) || countryCode
  );
}

function DistributionPie({
  data,
  centerLabel,
}: {
  data: PieData[];
  centerLabel: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center text-muted-foreground text-sm">
        No data
      </div>
    );
  }

  return (
    <div className="mx-auto aspect-square h-full max-h-[240px] w-full max-w-[240px]">
      <PieChart
        className="h-full w-full"
        cornerRadius={4}
        data={data}
        innerRadius={68}
        padAngle={0.02}
      >
        {data.map((item, index) => (
          <PieSlice
            color={item.color}
            hoverEffect="grow"
            index={index}
            key={item.label}
            showGlow={false}
          />
        ))}
        <PieCenter defaultLabel={centerLabel} />
      </PieChart>
    </div>
  );
}

export function UsersDistributionCard() {
  const [appId] = useQueryState('app', parseAsString);
  const [activeTab, setActiveTab] = useState<'platform' | 'country'>('country');
  const { data: overview } = useDeviceOverviewResponse(appId || '');

  const platformStats = (overview?.platformStats || {}) as Record<
    string,
    number
  >;
  const countryStats = (overview?.countryStats || {}) as Record<string, number>;

  const platformRows = useMemo(
    () =>
      (['ios', 'android'] as const)
        .map((platform) => ({
          key: platform,
          count: platformStats[platform] || 0,
        }))
        .filter((row) => row.count > 0)
        .sort((a, b) => b.count - a.count),
    [platformStats]
  );

  const platformTotal = useMemo(
    () => platformRows.reduce((sum, row) => sum + row.count, 0),
    [platformRows]
  );

  const countryListRows = useMemo(
    () =>
      Object.entries(countryStats)
        .filter(([, count]) => count > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([key, count]) => ({ key, count })),
    [countryStats]
  );

  const countryPieRows = useMemo(() => {
    const top = countryListRows.slice(0, TOP_COUNTRIES);
    const rest = countryListRows.slice(TOP_COUNTRIES);
    const othersCount = rest.reduce((sum, row) => sum + row.count, 0);
    const rows = [...top];
    if (othersCount > 0) {
      rows.push({ key: 'others', count: othersCount });
    }
    return rows;
  }, [countryListRows]);

  const countryTotal = useMemo(
    () => countryListRows.reduce((sum, row) => sum + row.count, 0),
    [countryListRows]
  );

  const pieData = useMemo((): PieData[] => {
    if (activeTab === 'platform') {
      return platformRows.map((row) => ({
        label: getPlatformLabel(row.key),
        value: row.count,
        color: PLATFORM_COLORS[row.key] ?? 'var(--chart-1)',
      }));
    }

    return countryPieRows.map((row, index) => ({
      label: getCountryLabel(row.key),
      value: row.count,
      color: PIE_COLORS[index % PIE_COLORS.length],
    }));
  }, [activeTab, countryPieRows, platformRows]);

  if (!appId) {
    return null;
  }

  const listRows = activeTab === 'country' ? countryListRows : platformRows;
  const listTotal = activeTab === 'country' ? countryTotal : platformTotal;

  return (
    <Card className="min-w-0 overflow-hidden py-0">
      <CardContent className="min-w-0 space-y-4 p-4">
        <Tabs
          onValueChange={(v) => setActiveTab(v as 'platform' | 'country')}
          value={activeTab}
        >
          <TabsList className="h-8 max-w-full">
            <TabsTrigger
              className="text-muted-foreground text-xs uppercase"
              value="country"
            >
              <span>Countries</span>
            </TabsTrigger>
            <TabsTrigger
              className="text-muted-foreground text-xs uppercase"
              value="platform"
            >
              <span>Platforms</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-muted-foreground text-sm">
          {activeTab === 'platform'
            ? 'User distribution across platforms'
            : 'User distribution by country'}
        </p>

        <div className="grid min-w-0 gap-4 md:grid-cols-2 md:items-center">
          <ScrollArea className="h-[200px] w-full min-w-0 sm:h-[220px]">
            <div className="min-w-0 space-y-3 pr-4">
              {listRows.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-8">
                  <HugeiconsIcon
                    className="size-10 text-muted-foreground opacity-40"
                    icon={Flag02Icon}
                  />
                  <p className="text-center font-medium text-muted-foreground text-sm">
                    {activeTab === 'country'
                      ? 'No country data available'
                      : 'No platform data available'}
                  </p>
                </div>
              )}

              {listRows.map((row, index) => {
                const percentage = listTotal
                  ? (row.count / listTotal) * 100
                  : 0;
                const color =
                  activeTab === 'platform'
                    ? (PLATFORM_COLORS[row.key] ?? 'var(--chart-1)')
                    : PIE_COLORS[index % PIE_COLORS.length];

                return (
                  <div className="min-w-0 space-y-1.5" key={row.key}>
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {activeTab === 'country' ? (
                          row.key === 'others' ||
                          row.key.length !== 2 ||
                          !COUNTRY_CODE_REGEX.test(row.key) ? (
                            <HugeiconsIcon
                              className="size-3.5 shrink-0 text-muted-foreground"
                              icon={Flag02Icon}
                            />
                          ) : (
                            <span
                              className={`fi fi-${row.key.toLowerCase()} shrink-0 rounded-xs text-[14px]`}
                              title={getCountryLabel(row.key)}
                            />
                          )
                        ) : (
                          <HugeiconsIcon
                            className="size-4 shrink-0 text-muted-foreground"
                            icon={getPlatformIcon(row.key)}
                          />
                        )}
                        <span className="truncate font-medium text-sm">
                          {activeTab === 'country'
                            ? getCountryLabel(row.key)
                            : getPlatformLabel(row.key)}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-baseline gap-2">
                        <span className="font-semibold text-sm tabular-nums">
                          {row.count.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground text-xs tabular-nums">
                          ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DistributionPie
            centerLabel={activeTab === 'country' ? 'Users' : 'Devices'}
            data={pieData}
          />
        </div>
      </CardContent>
    </Card>
  );
}
