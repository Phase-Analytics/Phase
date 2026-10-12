import type { FunnelResult, FunnelStepResult } from '@phase/shared';

export type FunnelPeriod = {
  start: Date;
  end: Date;
};

function roundPct(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return Math.round((numerator * 10_000) / denominator) / 100;
}

export function buildStepResults(
  labels: Array<{ key: string; label: string }>,
  counts: number[]
): FunnelStepResult[] {
  const cohortSize = counts[0] ?? 0;
  return labels.map((step, index) => {
    const count = counts[index] ?? 0;
    const previous = index === 0 ? count : (counts[index - 1] ?? 0);
    return {
      key: step.key,
      label: step.label,
      count,
      conversionFromStart: roundPct(count, cohortSize),
      conversionFromPrevious: roundPct(count, previous),
    };
  });
}

export function toFunnelResult(
  steps: FunnelStepResult[],
  period: FunnelPeriod
): FunnelResult {
  const cohortSize = steps[0]?.count ?? 0;
  const last = steps.at(-1)?.count ?? 0;
  return {
    steps,
    cohortSize,
    overallConversion: roundPct(last, cohortSize),
    period: {
      startDate: period.start.toISOString(),
      endDate: period.end.toISOString(),
    },
  };
}
