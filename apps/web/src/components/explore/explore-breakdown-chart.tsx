'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

type ExploreBreakdownChartProps = {
  rows: Array<{ dimension: string; value: number }>;
};

const chartConfig = {
  value: {
    label: 'Count',
    color: 'var(--color-chart-1)',
  },
} satisfies ChartConfig;

export function ExploreBreakdownChart({ rows }: ExploreBreakdownChartProps) {
  const data = rows.slice(0, 20).map((row) => ({
    dimension: row.dimension || 'unknown',
    value: row.value,
  }));

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No breakdown data for this query.
      </p>
    );
  }

  return (
    <ChartContainer className="h-[280px] w-full" config={chartConfig}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
        <CartesianGrid horizontal={false} />
        <XAxis dataKey="value" type="number" />
        <YAxis
          dataKey="dimension"
          tick={{ fontSize: 11 }}
          type="category"
          width={100}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--color-chart-1)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
