'use client';

import type { FunnelResult } from '@phase/shared';
import { FunnelChart } from '@/components/charts/funnel-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const FUNNEL_SEGMENT_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-2)',
] as const;

export function formatFunnelPct(value: number): string {
  if (value <= 0) {
    return '0%';
  }
  if (value < 1) {
    return '<1%';
  }
  return `${value.toFixed(1)}%`;
}

type FunnelVisualizationProps = {
  result: FunnelResult | undefined;
  isLoading?: boolean;
  title?: string;
  className?: string;
  compact?: boolean;
};

export function FunnelVisualization({
  result,
  isLoading,
  title,
  className,
  compact = false,
}: FunnelVisualizationProps) {
  if (isLoading) {
    return (
      <FunnelVisualizationSkeleton className={className} compact={compact} />
    );
  }

  if (!result || result.steps.length === 0) {
    return (
      <Card className={cn('py-0', className)}>
        {title ? (
          <CardHeader className="border-b py-4">
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        ) : null}
        <CardContent
          className={cn(
            'flex items-center justify-center px-5',
            compact ? 'h-[140px]' : 'h-[180px]'
          )}
        >
          <p className="text-muted-foreground text-sm">No funnel data yet</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = result.steps.map((step, index) => ({
    label: step.label,
    value: Math.max(step.count, 0),
    displayValue: step.count.toLocaleString(),
    color: FUNNEL_SEGMENT_COLORS[index % FUNNEL_SEGMENT_COLORS.length],
  }));

  return (
    <Card className={cn('py-0', className)}>
      {title ? (
        <CardHeader className="space-y-1 border-b py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle>{title}</CardTitle>
            <div className="text-right text-sm">
              <div className="font-medium tabular-nums">
                {formatFunnelPct(result.overallConversion)} overall
              </div>
              <div className="text-muted-foreground tabular-nums">
                {result.cohortSize.toLocaleString()} in cohort
              </div>
            </div>
          </div>
        </CardHeader>
      ) : null}
      <CardContent className={cn('space-y-4 px-5', compact ? 'py-4' : 'py-5')}>
        <FunnelChart
          className={cn('w-full', compact ? 'min-h-[120px]' : 'min-h-[160px]')}
          color="var(--color-chart-1)"
          data={chartData}
          formatPercentage={formatFunnelPct}
          gap={3}
          layers={2}
          orientation="horizontal"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="pb-2 font-medium">Step</th>
                <th className="pb-2 text-right font-medium">Users</th>
                <th className="pb-2 text-right font-medium">Conv.</th>
              </tr>
            </thead>
            <tbody>
              {result.steps.map((step) => (
                <tr className="border-b last:border-0" key={step.key}>
                  <td className="py-2 pr-4">{step.label}</td>
                  <td className="py-2 text-right tabular-nums">
                    {step.count.toLocaleString()}
                  </td>
                  <td className="py-2 text-right text-muted-foreground tabular-nums">
                    {formatFunnelPct(step.conversionFromStart)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function FunnelVisualizationSkeleton({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Card className={cn('py-0', className)}>
      <CardHeader className="space-y-3 border-b py-4">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-3 px-5 py-4">
        <Skeleton
          className={cn('w-full', compact ? 'h-[120px]' : 'h-[160px]')}
        />
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  );
}
