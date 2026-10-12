import type { ExploreTimeRange } from '@phase/shared';
import type { DateRangeParams, TimeRange } from '@/lib/api/types';

const DAY_MS = 24 * 60 * 60 * 1000;

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

/** Resolves a relative range ("7d") to concrete dates at request time. */
export function toDateRangeParams(
  range: TimeRange | DateRangeParams | undefined
): DateRangeParams | undefined {
  if (typeof range !== 'string') {
    return range;
  }
  const days = Number.parseInt(range, 10);
  if (Number.isNaN(days)) {
    return;
  }
  const now = new Date();
  return {
    startDate: new Date(now.getTime() - days * DAY_MS).toISOString(),
    endDate: now.toISOString(),
  };
}
