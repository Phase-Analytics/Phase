import type { ExploreTimeRange } from '@phase/shared';

export type ExploreDateRange = {
  startDate: string;
  endDate: string;
};

export function resolveExploreDateRange(
  timeRange: ExploreTimeRange
): ExploreDateRange {
  const now = new Date();
  const days = Number.parseInt(timeRange.replace('d', ''), 10);
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return {
    startDate: start.toISOString(),
    endDate: now.toISOString(),
  };
}
