'use client';

import {
  AndroidIcon,
  AppleIcon,
  PackageIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { parseAsString, useQueryState } from 'nuqs';
import { useMemo, useState } from 'react';
import { PieCenter } from '@/components/charts/pie-center';
import { PieChart } from '@/components/charts/pie-chart';
import type { PieData } from '@/components/charts/pie-context';
import { PieSlice } from '@/components/charts/pie-slice';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDeviceOverviewResponse } from '@/lib/queries';

const TOP_VERSIONS = 6;
const VERSION_SPLIT_REGEX = /[^\d]+/;

const PIE_COLORS = [
  'var(--chart-1)',
  'oklch(0.62 0.14 165)',
  'oklch(0.72 0.14 55)',
  'oklch(0.58 0.16 310)',
  'oklch(0.65 0.14 25)',
  'oklch(0.55 0.08 230)',
  'var(--muted-foreground)',
] as const;

function compareVersions(a: string, b: string): number {
  const parse = (value: string) =>
    value
      .split(VERSION_SPLIT_REGEX)
      .map((part) => Number.parseInt(part, 10) || 0);

  const left = parse(a);
  const right = parse(b);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index++) {
    const diff = (right[index] ?? 0) - (left[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }

  return b.localeCompare(a);
}

function VersionPie({ data }: { data: PieData[] }) {
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
        <PieCenter defaultLabel="Devices" />
      </PieChart>
    </div>
  );
}

export function UsersAppVersionCard() {
  const [appId] = useQueryState('app', parseAsString);
  const [activeTab, setActiveTab] = useState<'ios' | 'android'>('ios');
  const { data: overview } = useDeviceOverviewResponse(appId || '');

  const versionStats: Record<string, number> =
    overview?.appVersionStats?.[activeTab] ?? {};

  const listRows = useMemo(
    () =>
      Object.entries(versionStats)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1] || compareVersions(a[0], b[0]))
        .map(([key, count]) => ({ key, count })),
    [versionStats]
  );

  const pieRows = useMemo(() => {
    const top = listRows.slice(0, TOP_VERSIONS);
    const rest = listRows.slice(TOP_VERSIONS);
    const othersCount = rest.reduce((sum, row) => sum + row.count, 0);
    const rows = [...top];
    if (othersCount > 0) {
      rows.push({ key: 'Others', count: othersCount });
    }
    return rows;
  }, [listRows]);

  const total = useMemo(
    () => listRows.reduce((sum, row) => sum + row.count, 0),
    [listRows]
  );

  const pieData = useMemo(
    (): PieData[] =>
      pieRows.map((row, index) => ({
        label: row.key,
        value: row.count,
        color: PIE_COLORS[index % PIE_COLORS.length],
      })),
    [pieRows]
  );

  if (!appId) {
    return null;
  }

  return (
    <Card className="min-w-0 overflow-hidden py-0">
      <CardContent className="min-w-0 space-y-4 p-4">
        <Tabs
          onValueChange={(value) => setActiveTab(value as 'ios' | 'android')}
          value={activeTab}
        >
          <TabsList className="h-8 max-w-full">
            <TabsTrigger
              className="gap-1.5 text-muted-foreground text-xs uppercase"
              value="ios"
            >
              <HugeiconsIcon className="size-3.5" icon={AppleIcon} />
              <span>iOS</span>
            </TabsTrigger>
            <TabsTrigger
              className="gap-1.5 text-muted-foreground text-xs uppercase"
              value="android"
            >
              <HugeiconsIcon className="size-3.5" icon={AndroidIcon} />
              <span>Android</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-muted-foreground text-sm">
          App version distribution on {activeTab === 'ios' ? 'iOS' : 'Android'}
        </p>

        <div className="grid min-w-0 gap-4 md:grid-cols-2 md:items-center">
          <ScrollArea className="h-[200px] w-full min-w-0 sm:h-[220px]">
            <div className="min-w-0 space-y-3 pr-4">
              {listRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8">
                  <HugeiconsIcon
                    className="size-10 text-muted-foreground opacity-40"
                    icon={PackageIcon}
                  />
                  <p className="text-center font-medium text-muted-foreground text-sm">
                    No app version data available
                  </p>
                </div>
              ) : (
                listRows.map((row, index) => {
                  const percentage = total ? (row.count / total) * 100 : 0;
                  const color = PIE_COLORS[index % PIE_COLORS.length];

                  return (
                    <div className="min-w-0 space-y-1.5" key={row.key}>
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <span className="truncate font-medium text-sm">
                          {row.key}
                        </span>
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
                })
              )}
            </div>
          </ScrollArea>

          <VersionPie data={pieData} />
        </div>
      </CardContent>
    </Card>
  );
}
