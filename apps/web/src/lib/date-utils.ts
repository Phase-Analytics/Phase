import { type DateFormat, useTimezoneStore } from '@/stores/timezone-store';

type TimeFormat = '12h' | '24h';

const formatterCache = new Map<string, Intl.DateTimeFormat>();

/** Intl.DateTimeFormat construction is expensive; reuse one per (locale, options). */
function getDateTimeFormatter(
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  const key = `${locale ?? ''}|${JSON.stringify(options)}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    formatterCache.set(key, formatter);
  }
  return formatter;
}

function getBrowserLocale(): string {
  if (typeof window === 'undefined') {
    return 'en-US';
  }
  return navigator.language || 'en-US';
}

/** Calendar day (YYYY-MM-DD) of an instant in the given IANA time zone. */
export function toDayKey(date: Date, timeZone: string): string {
  const parts = getDateTimeFormatter('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '01';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function formatDateParts(
  date: Date,
  timezone: string,
  dateFormat: DateFormat
): string {
  const [year, month, day] = toDayKey(date, timezone).split('-');
  if (dateFormat === 'MM/DD/YYYY') {
    return `${month}/${day}/${year}`;
  }
  return `${day}/${month}/${year}`;
}

export type DateDisplaySettings = {
  timezone: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
};

function resolveSettings(
  overrides?: Partial<DateDisplaySettings>
): DateDisplaySettings {
  const state = useTimezoneStore.getState();
  return {
    timezone: overrides?.timezone ?? state.timezone,
    dateFormat: overrides?.dateFormat ?? state.dateFormat,
    timeFormat: overrides?.timeFormat ?? state.timeFormat,
  };
}

function formatTimePart(date: Date, settings: DateDisplaySettings): string {
  return getDateTimeFormatter(getBrowserLocale(), {
    timeZone: settings.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: settings.timeFormat === '12h',
  }).format(date);
}

export function formatDateTime(
  dateStr: string | null | undefined,
  overrides?: Partial<DateDisplaySettings>
): string {
  if (!dateStr) {
    return 'N/A';
  }

  try {
    const settings = resolveSettings(overrides);
    const date = new Date(dateStr);
    return `${formatDateParts(date, settings.timezone, settings.dateFormat)} ${formatTimePart(date, settings)}`;
  } catch {
    return 'N/A';
  }
}

export function formatDate(
  dateStr: string | null | undefined,
  overrides?: Partial<DateDisplaySettings>
): string {
  if (!dateStr) {
    return 'N/A';
  }

  try {
    const settings = resolveSettings(overrides);
    return formatDateParts(
      new Date(dateStr),
      settings.timezone,
      settings.dateFormat
    );
  } catch {
    return 'N/A';
  }
}

export function formatTime(
  dateStr: string | null | undefined,
  overrides?: Partial<DateDisplaySettings>
): string {
  if (!dateStr) {
    return 'N/A';
  }

  try {
    return formatTimePart(new Date(dateStr), resolveSettings(overrides));
  } catch {
    return 'N/A';
  }
}

export const formatDateTimeLong = formatDateTime;

export function formatDateTimeSeparate(
  dateStr: string | null | undefined,
  overrides?: Partial<DateDisplaySettings>
): { date: string; time: string } {
  if (!dateStr) {
    return { date: 'N/A', time: 'N/A' };
  }

  return {
    date: formatDate(dateStr, overrides),
    time: formatTime(dateStr, overrides),
  };
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) {
    return 'N/A';
  }

  try {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();

    if (Number.isNaN(diffMs)) {
      return 'N/A';
    }

    if (diffMs < 0) {
      return 'just now';
    }

    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 1) {
      return 'just now';
    }
    if (minutes < 60) {
      return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
      return days === 1 ? '1 day ago' : `${days} days ago`;
    }

    const weeks = Math.floor(days / 7);
    if (weeks < 5) {
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
      return months === 1 ? '1 month ago' : `${months} months ago`;
    }

    const years = Math.floor(days / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  } catch {
    return 'N/A';
  }
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) {
    return '0 seconds';
  }

  const totalSeconds = Math.floor(seconds);

  if (totalSeconds < 0) {
    return '—';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(hours.toString());
  }
  if (mins > 0) {
    parts.push(mins.toString());
  }
  if (secs > 0) {
    parts.push(secs.toString());
  }

  if (parts.length === 1) {
    if (hours > 0) {
      return hours === 1 ? '1 hour' : `${hours} hours`;
    }
    if (mins > 0) {
      return mins === 1 ? '1 minute' : `${mins} minutes`;
    }
    return secs === 1 ? '1 second' : `${secs} seconds`;
  }

  const result: string[] = [];
  if (hours > 0) {
    result.push(`${hours}hr`);
  }
  if (mins > 0) {
    result.push(`${mins}m`);
  }
  if (secs > 0) {
    result.push(`${secs}s`);
  }

  return result.join(' ');
}
