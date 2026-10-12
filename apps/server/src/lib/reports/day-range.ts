import { ErrorCode, HttpStatus } from '@phase/shared';
import { type ValidationResult, validateDateRange } from '@/lib/validators';

export const DEFAULT_TIME_ZONE = 'UTC';
export const MAX_REPORT_RANGE_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

// QuestDB 9.1 ignores the offset of Etc/GMT±N zones, so they would bucket
// events differently from Postgres.
const ETC_OFFSET_ZONE_REGEX = /^Etc\/GMT[+-]\d+$/;

const supportedTimeZones = new Set<string>([
  ...Intl.supportedValuesOf('timeZone').filter(
    (zone) => !ETC_OFFSET_ZONE_REGEX.test(zone)
  ),
  'UTC',
]);

// Browsers (ICU) still report some legacy link names that the Postgres image's
// tzdata no longer ships; map them to their current IANA names.
const LEGACY_TIME_ZONE_ALIASES: Record<string, string> = {
  'Africa/Asmera': 'Africa/Asmara',
  'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
  'America/Catamarca': 'America/Argentina/Catamarca',
  'America/Coral_Harbour': 'America/Atikokan',
  'America/Cordoba': 'America/Argentina/Cordoba',
  'America/Godthab': 'America/Nuuk',
  'America/Indianapolis': 'America/Indiana/Indianapolis',
  'America/Jujuy': 'America/Argentina/Jujuy',
  'America/Louisville': 'America/Kentucky/Louisville',
  'America/Mendoza': 'America/Argentina/Mendoza',
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Rangoon': 'Asia/Yangon',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Atlantic/Faeroe': 'Atlantic/Faroe',
  'Etc/GMT': 'UTC',
  'Etc/UTC': 'UTC',
  'Europe/Kiev': 'Europe/Kyiv',
  GMT: 'UTC',
  'Pacific/Enderbury': 'Pacific/Kanton',
  'Pacific/Ponape': 'Pacific/Pohnpei',
  'Pacific/Truk': 'Pacific/Chuuk',
};

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function invalid(detail: string): ValidationResult<never> {
  return {
    success: false,
    error: {
      code: ErrorCode.VALIDATION_ERROR,
      detail,
      status: HttpStatus.BAD_REQUEST,
    },
  };
}

/**
 * Accepts IANA zone names only. Raw offsets ("+03:00") are rejected because
 * Postgres interprets POSIX-style offsets with the opposite sign.
 */
export function parseTimeZone(raw: string | undefined): ValidationResult<string> {
  if (!raw) {
    return { success: true, data: DEFAULT_TIME_ZONE };
  }

  let resolved: string;
  try {
    resolved = new Intl.DateTimeFormat('en-US', {
      timeZone: raw,
    }).resolvedOptions().timeZone;
  } catch {
    return invalid('Invalid tz: must be an IANA time zone name');
  }

  const canonical = LEGACY_TIME_ZONE_ALIASES[resolved] ?? resolved;
  if (!supportedTimeZones.has(canonical)) {
    return invalid('Invalid tz: must be an IANA time zone name');
  }

  return { success: true, data: canonical };
}

function dateFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = dateFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    dateFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Calendar date (YYYY-MM-DD) of an instant as seen in `timeZone`. */
export function localDateOf(instant: Date, timeZone: string): string {
  return dateFormatter(timeZone).format(instant);
}

function dateOnlyToUtcMs(date: string): number {
  const match = DATE_ONLY_REGEX.exec(date);
  if (!match) {
    throw new Error(`Invalid calendar date: ${date}`);
  }
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function addCalendarDays(date: string, days: number): string {
  return new Date(dateOnlyToUtcMs(date) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export type DayRange = {
  timeZone: string;
  /** Local calendar days covered by the report, oldest first. */
  days: string[];
  firstDay: string;
  lastDay: string;
  /**
   * UTC scan window guaranteed to contain every instant whose local date is in
   * `days` (zone offsets stay within ±14h, so a one-day pad is always enough).
   * Callers bucket by local date and discard buckets outside `days`.
   */
  scanStart: Date;
  scanEnd: Date;
  /** The requested (or defaulted) instants, echoed back in responses. */
  period: { startDate: string; endDate: string };
};

/**
 * Whole local calendar days from day(start) through day(end), capped at the
 * current local day.
 */
export function resolveDayRange(options: {
  startDate?: string;
  endDate?: string;
  defaultDays: number;
  timeZone: string;
  now?: Date;
}): DayRange {
  const now = options.now ?? new Date();
  const start = options.startDate
    ? new Date(options.startDate)
    : new Date(now.getTime() - options.defaultDays * DAY_MS);
  const end = options.endDate ? new Date(options.endDate) : now;

  const firstDay = localDateOf(start, options.timeZone);
  const requestedLastDay = localDateOf(end, options.timeZone);
  const today = localDateOf(now, options.timeZone);
  const lastDay = requestedLastDay < today ? requestedLastDay : today;

  const days: string[] = [];
  for (let day = firstDay; day <= lastDay; day = addCalendarDays(day, 1)) {
    days.push(day);
  }

  return {
    timeZone: options.timeZone,
    days,
    firstDay,
    lastDay,
    scanStart: new Date(dateOnlyToUtcMs(firstDay) - DAY_MS),
    scanEnd: new Date(dateOnlyToUtcMs(lastDay) + 2 * DAY_MS),
    period: { startDate: start.toISOString(), endDate: end.toISOString() },
  };
}

/**
 * Base date validation plus a span cap. When only startDate is given the span
 * is measured against now, matching how the range is resolved.
 */
export function validateReportDateRange(
  startDate: string | undefined,
  endDate: string | undefined,
  maxDays = MAX_REPORT_RANGE_DAYS,
  now = new Date()
): ValidationResult<void> {
  const baseValidation = validateDateRange(startDate, endDate);
  if (!(baseValidation.success && startDate)) {
    return baseValidation;
  }

  const end = endDate ? new Date(endDate) : now;
  if (end.getTime() - new Date(startDate).getTime() > maxDays * DAY_MS) {
    return invalid(`Date range cannot exceed ${maxDays} days`);
  }

  return baseValidation;
}
