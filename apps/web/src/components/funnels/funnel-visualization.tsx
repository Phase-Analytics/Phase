'use client';

import type { FunnelResult } from '@phase/shared';
import { FunnelChart } from '@/components/charts/funnel-chart';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function formatFunnelPct(value: number): string {
  if (value <= 0) {
    return '0%';
  }
  if (value < 1) {
    return '<1%';
  }
  return `${Math.round(value)}%`;
}

type FunnelVisualizationProps = {
  result: FunnelResult | undefined;
  isLoading?: boolean;
  className?: string;
};

export function FunnelVisualization({
  result,
  isLoading,
  className,
}: FunnelVisualizationProps) {
  if (isLoading) {
    return <FunnelVisualizationSkeleton className={className} />;
  }

  if (!result || result.steps.length === 0) {
    return (
      <Card className={cn('py-0', className)}>
        <CardContent className="flex h-[120px] items-center justify-center px-5">
          <p className="text-muted-foreground text-sm">No funnel data yet</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = result.steps.map((step) => ({
    label: step.label,
    value: Math.max(step.count, 0),
    displayValue: step.count.toLocaleString(),
  }));

  return (
    <Card className={cn('py-0', className)}>
      <CardContent className="px-5 py-4">
        <FunnelChart
          className="min-h-[96px] w-full"
          color="var(--color-muted-foreground)"
          data={chartData}
          formatPercentage={formatFunnelPct}
          gap={2}
          layers={3}
          orientation="horizontal"
          style={{ aspectRatio: '3.4 / 1' }}
        />
      </CardContent>
    </Card>
  );
}

export function FunnelVisualizationSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <Card className={cn('py-0', className)}>
      <CardContent className="px-5 py-4">
        <Skeleton className="h-[96px] w-full" />
      </CardContent>
    </Card>
  );
}
