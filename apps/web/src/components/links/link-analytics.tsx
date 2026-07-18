'use client';

import { useMemo, useState } from 'react';
import { LinkAnalyticsBreakdownCard } from '@/components/links/link-analytics-breakdown';
import { LinkAnalyticsGeoCard } from '@/components/links/link-analytics-geo-card';
import { TimescaleChart } from '@/components/timescale-chart';
import { Card, CardContent } from '@/components/ui/card';
import { CountingNumber } from '@/components/ui/counting-number';
import { Skeleton } from '@/components/ui/skeleton';
import { useLinkAnalytics } from '@/lib/queries';

type LinkAnalyticsProps = {
  appId: string;
  linkId: string;
};

export function LinkAnalytics({ appId, linkId }: LinkAnalyticsProps) {
  const [metric, setMetric] = useState<'clicks' | 'unique'>('clicks');
  const { data, isPending } = useLinkAnalytics(appId, linkId);

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
    return null;
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
        description="All-time daily link engagement"
        isPending={false}
        metric={metric}
        metricOptions={[
          { value: 'clicks', label: 'Clicks' },
          { value: 'unique', label: 'Unique visits' },
        ]}
        onMetricChange={(value) => setMetric(value as 'clicks' | 'unique')}
        showTimeRange={false}
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
