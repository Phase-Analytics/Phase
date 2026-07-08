'use client';

import {
  Calendar03Icon,
  CheckmarkSquare01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { type ReactNode, useMemo } from 'react';
import { Area } from '@/components/charts/area';
import { AreaChart } from '@/components/charts/area-chart';
import { Grid } from '@/components/charts/grid';
import { ChartTooltip } from '@/components/charts/tooltip';
import { XAxis } from '@/components/charts/x-axis';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  data: Array<{ date: string; value: number; label?: string }>;
  isPending: boolean;
  showTimeRange?: boolean;
  timeRange?: string;
  timeRangeOptions?: TimeRangeOption[];
  onTimeRangeChange?: (value: string) => void;
  metric?: string;
  metricOptions?: MetricOption[];
  onMetricChange?: (value: string) => void;
  dataKey: string;
  dataLabel: string;
  chartColor: string;
  valueFormatter?: (value: number) => string | number;
  xTickFormatter?: (value: string) => string;
  tooltipLabelFormatter?: (value: string) => ReactNode;
  emptyMessage?: string;
};

const DAY_INDEX_PATTERN = /^\d+$/;

function parseChartDate(value: string): Date | null {
  if (!value) {
    return null;
  }

  if (DAY_INDEX_PATTERN.test(value)) {
    const day = Number(value);
    if (!Number.isFinite(day) || day < 0 || day > 10_000) {
      return null;
    }
    return new Date(Date.UTC(2020, 0, 1 + day));
  }

  const withTime = value.includes('T') ? value : `${value}T00:00:00`;
  const date = new Date(withTime);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function TimescaleChart({
  title,
  description,
  data,
  isPending,
  showTimeRange = true,
  timeRange = '',
  timeRangeOptions = [],
  onTimeRangeChange,
  metric,
  metricOptions,
  onMetricChange,
  dataLabel,
  chartColor,
  valueFormatter,
  xTickFormatter,
  tooltipLabelFormatter,
  emptyMessage = 'No data available for this period',
}: TimescaleChartProps) {
  const currentOption = timeRangeOptions.find((opt) => opt.value === timeRange);
  const currentLabel = currentOption?.label || timeRangeOptions[0]?.label;

  const chartData = useMemo(() => {
    const points: Array<{
      date: Date;
      value: number;
      rawDate: string;
      xLabel?: string;
    }> = [];

    for (const point of data) {
      const date = parseChartDate(point.date);
      if (!date) {
        continue;
      }

      const xLabel =
        point.label ??
        (xTickFormatter ? xTickFormatter(point.date) : undefined);

      points.push({
        date,
        value: point.value,
        rawDate: point.date,
        ...(xLabel ? { xLabel } : {}),
      });
    }

    return points;
  }, [data, xTickFormatter]);

  const dashFromIndex = useMemo(() => {
    if (chartData.length < 2) {
      return;
    }
    const firstValue = chartData[0].value;
    if (chartData.every((point) => point.value === firstValue)) {
      return;
    }
    return chartData.length - 1;
  }, [chartData]);

  const timeRangeControl =
    showTimeRange && onTimeRangeChange ? (
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
    ) : null;

  const status = isPending ? 'loading' : 'ready';
  const hasData = chartData.length > 0;
  const showEmpty = !(isPending || hasData);

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
              {timeRangeControl}
            </div>
            <CardDescription>{description}</CardDescription>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription className="pt-1">{description}</CardDescription>
            </div>
            {timeRangeControl}
          </div>
        )}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {showEmpty ? (
          <div className="flex h-[250px] items-center justify-center rounded-lg border border-dashed">
            <p className="text-muted-foreground text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <AreaChart
            animationDuration={900}
            className="h-[250px] w-full"
            data={chartData}
            loadingLabel={`Loading ${dataLabel.toLowerCase()}…`}
            margin={{ top: 40, right: 8, bottom: 28, left: 8 }}
            status={status}
            style={{ height: 250, aspectRatio: 'unset' }}
            yDomainTween
          >
            <Grid
              horizontal
              loadingStroke="color-mix(in oklch, var(--chart-grid) 45%, transparent)"
              numTicksRows={4}
              shimmer
              shimmerSync
              stroke="var(--chart-grid)"
              strokeDasharray="3,4"
              strokeOpacity={0.85}
            />
            <Area
              dashArray="5,5"
              dashFromIndex={dashFromIndex}
              dataKey="value"
              fadeEdges="left"
              fill={chartColor}
              fillOpacity={0.28}
              gradientToOpacity={0}
              loadingStroke={chartColor}
              loadingStrokeOpacity={0.4}
              loadingStyle="pulse"
              showHighlight
              stroke={chartColor}
              strokeWidth={2}
            />
            <XAxis numTicks={5} />
            <ChartTooltip
              content={({ point }) => {
                let rawDate = String(point.date);
                if (typeof point.rawDate === 'string') {
                  rawDate = point.rawDate;
                } else if (point.date instanceof Date) {
                  rawDate = point.date.toISOString();
                }

                const value =
                  typeof point.value === 'number'
                    ? point.value
                    : Number(point.value);
                const formattedValue = valueFormatter
                  ? valueFormatter(value)
                  : value;

                return (
                  <div className="flex min-w-[120px] flex-col gap-1.5 rounded-lg border border-border/60 bg-background/95 px-2.5 py-2 shadow-lg backdrop-blur-md">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      {tooltipLabelFormatter ? (
                        tooltipLabelFormatter(rawDate)
                      ) : (
                        <>
                          <HugeiconsIcon
                            className="size-3.5"
                            icon={Calendar03Icon}
                          />
                          <ClientDate date={rawDate} format="date" />
                        </>
                      )}
                    </div>
                    <div className="font-semibold text-base tabular-nums">
                      {formattedValue}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {dataLabel}
                    </div>
                  </div>
                );
              }}
              dotVariant="ring"
              indicatorDasharray="4 2"
            />
          </AreaChart>
        )}
      </CardContent>
    </Card>
  );
}
