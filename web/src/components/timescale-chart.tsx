'use client';

import {
  Calendar03Icon,
  CheckmarkSquare01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const chartConfig = {
    [dataKey]: {
      label: dataLabel,
      color: chartColor,
    },
  } satisfies ChartConfig;

  const currentOption = timeRangeOptions.find((opt) => opt.value === timeRange);
  const currentLabel = currentOption?.label || timeRangeOptions[0]?.label;

  const defaultFormatter = (value: number) => {
    if (value === 0) {
      return 'No Data';
    }
    return value;
  };

  if (!isMounted) {
    return (
      <Card className="py-0">
        <CardHeader className="space-y-0 border-b py-5">
          {metricOptions && onMetricChange && metric ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Tabs value={metric}>
                  <TabsList>
                    {metricOptions.map((option) => (
                      <TabsTrigger key={option.value} value={option.value}>
                        {option.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <Button disabled size="sm" variant="outline">
                  <HugeiconsIcon icon={Calendar03Icon} />
                  {currentLabel}
                </Button>
              </div>
              <CardDescription>{description}</CardDescription>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription className="pt-1">
                  {description}
                </CardDescription>
              </div>
              <Button disabled size="sm" variant="outline">
                <HugeiconsIcon icon={Calendar03Icon} />
                {currentLabel}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="py-0">
      <CardHeader className="space-y-0 border-b py-5">
        {metricOptions && onMetricChange && metric ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Tabs onValueChange={onMetricChange} value={metric}>
                <TabsList>
                  {metricOptions.map((option) => (
                    <TabsTrigger key={option.value} value={option.value}>
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
                  id={`fill${dataKey}`}
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
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="date"
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });
                }}
                tickLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => {
                      const formattedValue = valueFormatter
                        ? valueFormatter(value as number)
                        : defaultFormatter(value as number);
                      const isNoData =
                        value === 0 || formattedValue === 'No Data';
                      return (
                        <div className="flex flex-col gap-0.5">
                          <div className="font-semibold text-base tabular-nums">
                            {formattedValue}
                          </div>
                          {!isNoData && (
                            <div className="text-muted-foreground text-xs">
                              {dataLabel}
                            </div>
                          )}
                        </div>
                      );
                    }}
                    hideLabel={false}
                    indicator="dot"
                    labelFormatter={(value) => {
                      const formattedDate = new Date(value).toLocaleDateString(
                        'en-US',
                        {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }
                      );
                      return (
                        <span className="flex items-center gap-1.5">
                          <HugeiconsIcon
                            className="size-3.5"
                            icon={Calendar03Icon}
                          />
                          {formattedDate}
                        </span>
                      );
                    }}
                  />
                }
                cursor={false}
              />
              <Area
                dataKey="value"
                fill={`url(#fill${dataKey})`}
                stroke={`var(--color-${dataKey})`}
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
