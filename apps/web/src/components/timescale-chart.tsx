'use client';

import {
  Calendar03Icon,
  CheckmarkSquare01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/date-utils';

type TimeRangeOption = {
  value: string;
  label: string;
};

type MetricOption = {
  value: string;
  label: string;
};

type TimescaleChartProps = {
  title: string;
  description: string;
  data: Array<{ date: string; value: number }>;
  isPending: boolean;
  timeRange: string;
  timeRangeOptions: TimeRangeOption[];
  onTimeRangeChange: (value: string) => void;
  metric?: string;
  metricOptions?: MetricOption[];
  onMetricChange?: (value: string) => void;
  dataKey: string;
  dataLabel: string;
  chartColor: string;
  valueFormatter?: (value: number) => string | number;
  emptyMessage?: string;
};

export function TimescaleChart({
  title,
  description,
  data,
  isPending,
  timeRange,
  timeRangeOptions,
  onTimeRangeChange,
  metric,
  metricOptions,
  onMetricChange,
  dataKey,
  dataLabel,
  chartColor,
  valueFormatter,
  emptyMessage = 'No data available for this period',
}: TimescaleChartProps) {
  const chartId = useMemo(
    () => `${dataKey}-${Math.random().toString(36).slice(2, 11)}`,
    [dataKey]
  );

  const chartConfig = {
    [dataKey]: {
      label: dataLabel,
      color: chartColor,
    },
  } satisfies ChartConfig;

  const currentOption = timeRangeOptions.find((opt) => opt.value === timeRange);
  const currentLabel = currentOption?.label || timeRangeOptions[0]?.label;

  const defaultFormatter = (value: number) => value;

  const allValuesSame = useMemo(() => {
    if (data.length === 0) {
      return true;
    }
    const firstValue = data[0].value;
    return data.every((d) => d.value === firstValue);
  }, [data]);

  return (
    <Card className="py-0">
      <CardHeader className="space-y-0 border-b py-5">
        {metricOptions && onMetricChange && metric ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Tabs onValueChange={onMetricChange} value={metric}>
                <TabsList className="h-auto flex-wrap gap-1">
                  {metricOptions.map((option) => (
                    <TabsTrigger
                      className="text-muted-foreground text-xs uppercase"
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
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
                          timeRange === option.value
                            ? 'opacity-100'
                            : 'opacity-0'
                        }
                        icon={CheckmarkSquare01Icon}
                      />
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <CardDescription>{description}</CardDescription>
          </div>
        ) : (
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
        )}
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
            <AreaChart data={data}>
              <defs>
                <linearGradient
                  id={`fill-${chartId}`}
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={`var(--color-${dataKey})`}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={`var(--color-${dataKey})`}
                    stopOpacity={0.1}
                  />
                </linearGradient>
                {data.length >= 2 && (
                  <linearGradient
                    id={`stroke-${chartId}`}
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
                )}
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
              <ChartTooltip
                content={(props) => {
                  const filteredPayload = props.payload?.filter(
                    (item) => item.name !== '__dashed'
                  );
                  return (
                    <ChartTooltipContent
                      // biome-ignore lint/suspicious/noExplicitAny: Recharts payload filtering causes type issues
                      {...(props as any)}
                      formatter={(value) => {
                        const formattedValue = valueFormatter
                          ? valueFormatter(value as number)
                          : defaultFormatter(value as number);
                        return (
                          <div className="flex flex-col gap-0.5">
                            <div className="font-semibold text-base tabular-nums">
                              {formattedValue}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {dataLabel}
                            </div>
                          </div>
                        );
                      }}
                      hideLabel={false}
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
                      // biome-ignore lint/suspicious/noExplicitAny: Recharts payload filtering causes type issues
                      payload={filteredPayload as any}
                    />
                  );
                }}
                cursor={{
                  stroke: 'hsl(var(--border))',
                  strokeWidth: 1,
                  strokeDasharray: '4 2',
                }}
              />
              {data.length >= 2 && !allValuesSame && (
                <Area
                  activeDot={false}
                  dataKey="value"
                  fill="none"
                  name="__dashed"
                  stroke={`var(--color-${dataKey})`}
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  type="monotone"
                />
              )}
              <Area
                activeDot={{
                  r: 5,
                  stroke: `var(--color-${dataKey})`,
                  strokeWidth: 2,
                  fill: 'hsl(var(--background))',
                }}
                dataKey="value"
                fill={`url(#fill-${chartId})`}
                stroke={
                  data.length >= 2 && !allValuesSame
                    ? `url(#stroke-${chartId})`
                    : `var(--color-${dataKey})`
                }
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
