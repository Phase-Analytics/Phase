'use client';

import {
  LINK_ANALYTICS_DEFAULT_RANGE,
  LINK_ANALYTICS_RANGES,
  type LinkAnalyticsRange,
} from '@phase/shared';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { useMemo, useState } from 'react';
import { LinkAnalyticsBreakdownCard } from '@/components/links/link-analytics-breakdown';
import { LinkAnalyticsGeoCard } from '@/components/links/link-analytics-geo-card';
import { TimescaleChart } from '@/components/timescale-chart';
import { Card, CardContent } from '@/components/ui/card';
import { CountingNumber } from '@/components/ui/counting-number';
import { Skeleton } from '@/components/ui/skeleton';
import { ANALYTICS_TIME_RANGE_OPTIONS } from '@/lib/analytics-time-range';
import { useLinkAnalytics } from '@/lib/queries';
import { useLinkClickLiveUpdates } from '@/lib/queries/use-link-live-updates';

/** Shared by the analytics cards and the clicks table on the link page. */
export function useLinkAnalyticsRange() {
  return useQueryState(
    'linkRange',
    parseAsStringLiteral(LINK_ANALYTICS_RANGES).withDefault(
      LINK_ANALYTICS_DEFAULT_RANGE
    )
  );
}

type LinkAnalyticsProps = {
  appId: string;
  linkId: string;
};

export function LinkAnalytics({ appId, linkId }: LinkAnalyticsProps) {
  const [metric, setMetric] = useState<'clicks' | 'unique'>('clicks');
  const [range, setRange] = useLinkAnalyticsRange();
  const { data, isPending, isError } = useLinkAnalytics(appId, linkId, range);
  useLinkClickLiveUpdates(appId, linkId);

  const chartData = useMemo(
    () =>
      data?.timeseries.map((point) => ({
        date: point.date,
        value: metric === 'clicks' ? point.clicks : point.uniqueVisits,
      })) ?? [],
    [data?.timeseries, metric]
  );

  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return isError ? (
      <Card className="py-0">
        <CardContent className="p-4 text-muted-foreground text-sm">
          Link analytics are temporarily unavailable. Try again shortly.
        </CardContent>
      </Card>
    ) : null;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="py-0">
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs uppercase">
              Total clicks
            </p>
            <p className="font-bold text-3xl tabular-nums">
              <CountingNumber initiallyStable number={data.totalClicks} />
            </p>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs uppercase">
              Unique visits
            </p>
            <p className="font-bold text-3xl tabular-nums">
              <CountingNumber initiallyStable number={data.uniqueVisits} />
            </p>
          </CardContent>
        </Card>
      </div>

      <TimescaleChart
        chartColor="var(--color-chart-2)"
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
        onTimeRangeChange={(value) => setRange(value as LinkAnalyticsRange)}
        timeRange={range}
        timeRangeOptions={[...ANALYTICS_TIME_RANGE_OPTIONS]}
        title="Link activity"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <LinkAnalyticsGeoCard countries={data.countries} />
        <LinkAnalyticsBreakdownCard
          items={data.operatingSystems}
          title="Operating systems"
          variant="operatingSystems"
        />
        <LinkAnalyticsBreakdownCard
          items={data.browsers}
          title="Browsers"
          variant="browsers"
        />
        <LinkAnalyticsBreakdownCard
          items={data.referrers}
          title="Referrers"
          variant="referrers"
        />
      </div>
    </div>
  );
}
