'use client';

import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { ClientDate } from '@/components/client-date';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { formatDate, formatDuration } from '@/lib/date-utils';

type ExploreTimeseriesChartProps = {
  points: Array<{ date: string; value: number }>;
  formatAsDuration?: boolean;
};

const chartConfig = {
  value: {
    label: 'Value',
    color: 'var(--color-chart-2)',
  },
} satisfies ChartConfig;

export function ExploreTimeseriesChart({
  points,
  formatAsDuration = false,
}: ExploreTimeseriesChartProps) {
  const chartId = useMemo(() => 'explore-ts-chart', []);

  if (points.length === 0) {
    return <p className="text-muted-foreground text-sm">No timeseries data.</p>;
  }

  return (
    <ChartContainer
      className="aspect-auto h-[250px] w-full"
      config={chartConfig}
    >
      <AreaChart data={points}>
        <defs>
          <linearGradient id={`fill-${chartId}`} x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-chart-2)"
              stopOpacity={0.8}
            />
            <stop
              offset="95%"
              stopColor="var(--color-chart-2)"
              stopOpacity={0.1}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="date"
          minTickGap={32}
          tickFormatter={(value) => formatDate(value)}
          tickLine={false}
          tickMargin={8}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) =>
                formatAsDuration
                  ? formatDuration(Number(value))
                  : Number(value).toLocaleString()
              }
              labelFormatter={(value) => (
                <ClientDate date={value} format="date" />
              )}
            />
          }
        />
        <Area
          dataKey="value"
          fill={`url(#fill-${chartId})`}
          stroke="var(--color-chart-2)"
          strokeWidth={2}
          type="monotone"
        />
      </AreaChart>
    </ChartContainer>
  );
}
