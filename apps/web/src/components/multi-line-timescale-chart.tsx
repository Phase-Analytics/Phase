'use client';

import {
  Calendar03Icon,
  CheckmarkSquare01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useId } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ClientDate } from '@/components/client-date';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/date-utils';

type MultiLineSeries = {
  dataKey: string;
  label: string;
  color: string;
};

type MultiLineTimescaleChartProps = {
  title: string;
  description: string;
  data: Array<{ date: string } & Record<string, number | string>>;
  series: MultiLineSeries[];
  isPending: boolean;
  timeRange: string;
  timeRangeOptions: Array<{ value: string; label: string }>;
  onTimeRangeChange: (value: string) => void;
  emptyMessage?: string;
};

export function MultiLineTimescaleChart({
  title,
  description,
  data,
  series,
  isPending,
  timeRange,
  timeRangeOptions,
  onTimeRangeChange,
  emptyMessage = 'No data available for this period',
}: MultiLineTimescaleChartProps) {
  const chartId = useId().replaceAll(':', '');
  const chartConfig = Object.fromEntries(
    series.map(({ dataKey, label, color }) => [dataKey, { label, color }])
  ) satisfies ChartConfig;
  const currentLabel =
    timeRangeOptions.find((option) => option.value === timeRange)?.label ??
    timeRangeOptions[0]?.label;
  const variableSeries = new Set(
    series
      .filter(({ dataKey }) => {
        const firstValue = data[0]?.[dataKey];
        return data.some((point) => point[dataKey] !== firstValue);
      })
      .map(({ dataKey }) => dataKey)
  );

  return (
    <Card className="py-0">
      <CardHeader className="space-y-0 border-b py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="pt-1">{description}</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <HugeiconsIcon icon={Calendar03Icon} />
                {currentLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {timeRangeOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onTimeRangeChange(option.value)}
                >
                  <HugeiconsIcon
                    className={
                      timeRange === option.value ? 'opacity-100' : 'opacity-0'
                    }
                    icon={CheckmarkSquare01Icon}
                  />
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isPending && <Skeleton className="h-[250px] w-full" />}
        {!isPending && data.length === 0 && (
          <div className="flex h-[250px] items-center justify-center rounded-lg border border-dashed">
            <p className="text-muted-foreground text-sm">{emptyMessage}</p>
          </div>
        )}
        {!isPending && data.length > 0 && (
          <ChartContainer
            className="aspect-auto h-[250px] w-full"
            config={chartConfig}
          >
            <AreaChart accessibilityLayer data={data}>
              <defs>
                {series.map(({ dataKey }) => (
                  <linearGradient
                    id={`fill-${chartId}-${dataKey}`}
                    key={`fill-${dataKey}`}
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={`var(--color-${dataKey})`}
                      stopOpacity={0.16}
                    />
                    <stop
                      offset="95%"
                      stopColor={`var(--color-${dataKey})`}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                ))}
                {data.length >= 2 &&
                  series.map(({ dataKey }) => (
                    <linearGradient
                      id={`stroke-${chartId}-${dataKey}`}
                      key={`stroke-${dataKey}`}
                      x1="0"
                      x2="1"
                      y1="0"
                      y2="0"
                    >
                      <stop
                        offset={`${((data.length - 2) / (data.length - 1)) * 100}%`}
                        stopColor={`var(--color-${dataKey})`}
                        stopOpacity={1}
                      />
                      <stop
                        offset={`${((data.length - 2) / (data.length - 1)) * 100}%`}
                        stopColor={`var(--color-${dataKey})`}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  ))}
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="date"
                minTickGap={32}
                tick={{ fontFamily: 'var(--font-geist-mono)' }}
                tickFormatter={(value) => formatDate(value)}
                tickLine={false}
                tickMargin={8}
              />
              <YAxis
                axisLine={false}
                domain={[0, 50]}
                tickFormatter={(value) => `${value}%`}
                tickLine={false}
                ticks={[0, 10, 20, 30, 50]}
                width={42}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name, item) => (
                      <div className="flex min-w-32 flex-1 items-center gap-2">
                        <span
                          className="size-2.5 rounded-[2px]"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-muted-foreground">{name}</span>
                        <span className="ml-auto font-medium text-foreground tabular-nums">
                          {Number(value).toFixed(2)}%
                        </span>
                      </div>
                    )}
                    indicator="dot"
                    labelFormatter={(value) => (
                      <span className="flex items-center gap-1.5">
                        <HugeiconsIcon
                          className="size-3.5"
                          icon={Calendar03Icon}
                        />
                        <ClientDate date={value} format="date" />
                      </span>
                    )}
                  />
                }
                cursor={{
                  stroke: 'hsl(var(--border))',
                  strokeDasharray: '4 2',
                  strokeWidth: 1,
                }}
              />
              <ChartLegend content={<ChartLegendContent />} />
              {series.map(
                ({ dataKey }) =>
                  data.length >= 2 &&
                  variableSeries.has(dataKey) && (
                    <Area
                      activeDot={false}
                      dataKey={dataKey}
                      fill="none"
                      key={`dashed-${dataKey}`}
                      legendType="none"
                      name="__dashed"
                      stroke={`var(--color-${dataKey})`}
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      tooltipType="none"
                      type="monotone"
                    />
                  )
              )}
              {series.map(({ dataKey }) => (
                <Area
                  activeDot={{
                    fill: 'hsl(var(--background))',
                    r: 5,
                    stroke: `var(--color-${dataKey})`,
                    strokeWidth: 2,
                  }}
                  dataKey={dataKey}
                  fill={`url(#fill-${chartId}-${dataKey})`}
                  key={dataKey}
                  stroke={
                    data.length >= 2 && variableSeries.has(dataKey)
                      ? `url(#stroke-${chartId}-${dataKey})`
                      : `var(--color-${dataKey})`
                  }
                  strokeWidth={2}
                  type="monotone"
                />
              ))}
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
