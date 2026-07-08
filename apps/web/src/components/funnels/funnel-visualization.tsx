'use client';

import type { FunnelResult } from '@phase/shared';
import { FunnelChart } from '@/components/charts/funnel-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type FunnelVisualizationProps = {
  result: FunnelResult | undefined;
  isLoading?: boolean;
  title?: string;
  description?: string;
  className?: string;
};

export function FunnelVisualization({
  result,
  isLoading,
  title,
  description,
  className,
}: FunnelVisualizationProps) {
  if (isLoading) {
    return <FunnelVisualizationSkeleton className={className} />;
  }

  if (!result || result.steps.length === 0) {
    return (
      <Card className={cn('py-0', className)}>
        {(title || description) && (
          <CardHeader className="space-y-1 border-b py-5">
            {title ? <CardTitle>{title}</CardTitle> : null}
            {description ? (
              <p className="text-muted-foreground text-sm">{description}</p>
            ) : null}
          </CardHeader>
        )}
        <CardContent className="flex h-[280px] items-center justify-center px-6">
          <p className="text-muted-foreground text-sm">No funnel data yet</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = result.steps.map((step) => ({
    label: step.label,
    value: step.count,
    displayValue: step.count.toLocaleString(),
  }));

  return (
    <Card className={cn('py-0', className)}>
      {(title || description) && (
        <CardHeader className="space-y-1 border-b py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              {title ? <CardTitle>{title}</CardTitle> : null}
              {description ? (
                <p className="text-muted-foreground text-sm">{description}</p>
              ) : null}
            </div>
            <div className="text-right text-sm">
              <div className="font-medium tabular-nums">
                {result.overallConversion.toFixed(1)}% overall
              </div>
              <div className="text-muted-foreground tabular-nums">
                {result.cohortSize.toLocaleString()} in cohort
              </div>
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent className="space-y-6 px-6 py-6">
        <FunnelChart
          className="min-h-[220px] w-full"
          color="var(--color-chart-1)"
          data={chartData}
          layers={3}
          orientation="horizontal"
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="pb-2 font-medium">Step</th>
                <th className="pb-2 text-right font-medium">Users</th>
                <th className="pb-2 text-right font-medium">From start</th>
                <th className="pb-2 text-right font-medium">From previous</th>
              </tr>
            </thead>
            <tbody>
              {result.steps.map((step) => (
                <tr className="border-b last:border-0" key={step.key}>
                  <td className="py-2.5 pr-4">{step.label}</td>
                  <td className="py-2.5 text-right tabular-nums">
                    {step.count.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {step.conversionFromStart.toFixed(1)}%
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {step.conversionFromPrevious.toFixed(1)}%
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
}: {
  className?: string;
}) {
  return (
    <Card className={cn('py-0', className)}>
      <CardHeader className="space-y-3 border-b py-5">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-4 px-6 py-6">
        <Skeleton className="h-[220px] w-full" />
        <Skeleton className="h-32 w-full" />
      </CardContent>
    </Card>
  );
}
