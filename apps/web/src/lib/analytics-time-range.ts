import type { ExploreTimeRange } from '@phase/shared';
import type { TimeRange } from '@/lib/api/types';

export const ANALYTICS_TIME_RANGE_OPTIONS = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '1 Month' },
  { value: '180d', label: '6 Months' },
  { value: '360d', label: '1 Year' },
] as const;

export type AnalyticsTimeRangeValue =
  (typeof ANALYTICS_TIME_RANGE_OPTIONS)[number]['value'];

export function isAnalyticsTimeRange(
  value: string | null | undefined
): value is AnalyticsTimeRangeValue {
  return ANALYTICS_TIME_RANGE_OPTIONS.some((option) => option.value === value);
}

export function toExploreTimeRange(value: string): ExploreTimeRange {
  if (
    value === '7d' ||
    value === '30d' ||
    value === '180d' ||
    value === '360d'
  ) {
    return value;
  }
  return '7d';
}

export function toChartTimeRange(value: string): TimeRange {
  if (isAnalyticsTimeRange(value)) {
    return value;
  }
  return '7d';
}

export function getAnalyticsTimeRangeLabel(value: string): string {
  return (
    ANALYTICS_TIME_RANGE_OPTIONS.find((option) => option.value === value)
      ?.label ?? '7 Days'
  );
}
