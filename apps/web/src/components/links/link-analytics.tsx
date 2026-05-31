'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { useMemo, useState } from 'react';
import { AnalyticsTimeRangePicker } from '@/components/analytics/analytics-time-range-picker';
import { TimescaleChart } from '@/components/timescale-chart';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ANALYTICS_TIME_RANGE_OPTIONS,
  isAnalyticsTimeRange,
} from '@/lib/analytics-time-range';
import { useLinkAnalytics } from '@/lib/queries';

type LinkAnalyticsProps = {
  appId: string;
  linkId: string;
};

const RANGE_MS: Record<string, number> = {
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '180d': 180 * 24 * 60 * 60 * 1000,
  '360d': 360 * 24 * 60 * 60 * 1000,
};

function BreakdownList({
  title,
  items,
}: {
  title: string;
  items: Array<{ key: string; count: number }>;
}) {
  return (
    <Card className="py-0">
      <CardContent className="space-y-3 p-4">
        <h3 className="font-semibold text-muted-foreground text-sm uppercase">
          {title}
        </h3>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No data yet</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                className="flex items-center justify-between text-sm"
                key={`${title}-${item.key}`}
              >
                <span className="truncate">
                  {item.key === 'unknown' || item.key === 'direct'
                    ? item.key
                    : item.key}
                </span>
                <span className="font-medium tabular-nums">{item.count}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function LinkAnalytics({ appId, linkId }: LinkAnalyticsProps) {
  const [range, setRange] = useQueryState(
    'range',
    parseAsString.withDefault('7d')
  );
  const [metric, setMetric] = useState<'clicks' | 'unique'>('clicks');
  const { data, isPending } = useLinkAnalytics(appId, linkId, range);

  const chartData = useMemo(() => {
    if (!data?.timeseries) {
      return [];
    }

    const safeRange = isAnalyticsTimeRange(range) ? range : '7d';
    const ms = RANGE_MS[safeRange] ?? RANGE_MS['7d'];
    const end = new Date();
    const start = new Date(end.getTime() - ms);
    const dataMap = new Map(
      data.timeseries.map((point) => [
        point.date,
        metric === 'clicks' ? point.clicks : point.uniqueVisits,
      ])
    );

    const points: Array<{ date: string; value: number }> = [];
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      points.push({
        date: dateStr,
        value: dataMap.get(dateStr) ?? 0,
      });
      current.setDate(current.getDate() + 1);
    }

    return points;
  }, [data?.timeseries, metric, range]);

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <AnalyticsTimeRangePicker />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="py-0">
          <CardContent className="p-4">
            <p className="text-muted-foreground text-sm">Total clicks</p>
            <p className="font-bold text-3xl tabular-nums">
              {data.totalClicks}
            </p>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-4">
            <p className="text-muted-foreground text-sm">Unique visits</p>
            <p className="font-bold text-3xl tabular-nums">
              {data.uniqueVisits}
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              Cookieless daily estimate. Resets each UTC day.
            </p>
          </CardContent>
        </Card>
      </div>

      <TimescaleChart
        chartColor="var(--color-chart-1)"
        data={chartData}
        dataKey="value"
        dataLabel={metric === 'clicks' ? 'Clicks' : 'Unique visits'}
        description="Daily link engagement"
        isPending={false}
        metric={metric}
        metricOptions={[
          { value: 'clicks', label: 'Clicks' },
          { value: 'unique', label: 'Unique visits' },
        ]}
        onMetricChange={(value) => setMetric(value as 'clicks' | 'unique')}
        onTimeRangeChange={setRange}
        timeRange={range}
        timeRangeOptions={[...ANALYTICS_TIME_RANGE_OPTIONS]}
        title="Link activity"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownList items={data.countries} title="Countries" />
        <BreakdownList items={data.platforms} title="Platforms" />
        <BreakdownList
          items={data.operatingSystems}
          title="Operating systems"
        />
        <BreakdownList items={data.browsers} title="Browsers" />
        <BreakdownList items={data.referrers} title="Referrers" />
      </div>
    </div>
  );
}
