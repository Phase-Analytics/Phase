import { toDayKey } from '@/lib/date-utils';

export type DailyTimeseriesPoint = {
  date: string;
  value: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKeyToUtcMs(dayKey: string): number {
  const [year, month, day] = dayKey.split('-').map(Number);
  return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

/** Every calendar day (YYYY-MM-DD) from start to end inclusive, in `timeZone`. */
export function getDayKeysBetween(
  start: Date,
  end: Date,
  timeZone: string
): string[] {
  // Step over calendar days in UTC so DST transitions never skip or repeat a day.
  const last = dayKeyToUtcMs(toDayKey(end, timeZone));
  const keys: string[] = [];
  for (
    let cursor = dayKeyToUtcMs(toDayKey(start, timeZone));
    cursor <= last;
    cursor += DAY_MS
  ) {
    keys.push(new Date(cursor).toISOString().slice(0, 10));
  }
  return keys;
}

export function fillDailyTimeseriesGaps(
  points: DailyTimeseriesPoint[],
  period: { startDate: string | Date; endDate: string | Date },
  timeZone: string
): DailyTimeseriesPoint[] {
  const values = new Map(
    points.map((point) => [point.date.slice(0, 10), point.value])
  );
  return getDayKeysBetween(
    new Date(period.startDate),
    new Date(period.endDate),
    timeZone
  ).map((date) => ({ date, value: values.get(date) ?? 0 }));
}

/** The `count` calendar days ending today in `timeZone`, oldest first. */
export function getTrailingDayKeys(
  count: number,
  timeZone: string,
  now = new Date()
): string[] {
  const last = dayKeyToUtcMs(toDayKey(now, timeZone));
  return Array.from({ length: count }, (_, index) =>
    new Date(last - (count - 1 - index) * DAY_MS).toISOString().slice(0, 10)
  );
}
