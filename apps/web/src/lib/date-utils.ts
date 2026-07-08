const AM_PM_REGEX = /[ap]m/i;

type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY';

export function getUserTimezone(): string {
  if (typeof window === 'undefined') {
    return 'UTC';
  }

  try {
    const stored = localStorage.getItem('user-timezone');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.timezone) {
        return parsed.state.timezone;
      }
    }
  } catch {
    // If parsing fails, fall through to browser default
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function getUserDateFormat(): DateFormat {
  if (typeof window === 'undefined') {
    return 'DD/MM/YYYY';
  }

  try {
    const stored = localStorage.getItem('user-timezone');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.dateFormat) {
        return parsed.state.dateFormat;
      }
    }
  } catch {
    // If parsing fails, fall through to default
  }

  return 'DD/MM/YYYY';
}

export function getUserTimeFormat(): '12h' | '24h' {
  if (typeof window === 'undefined') {
    const formatter = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
    });
    const testDate = new Date(2024, 0, 1, 13, 0, 0);
    const formatted = formatter.format(testDate);
    return AM_PM_REGEX.test(formatted) ? '12h' : '24h';
  }

  try {
    const stored = localStorage.getItem('user-timezone');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.timeFormat) {
        return parsed.state.timeFormat;
      }
    }
  } catch {
    // If parsing fails, fall through to default
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
  });
  const testDate = new Date(2024, 0, 1, 13, 0, 0);
  const formatted = formatter.format(testDate);
  return AM_PM_REGEX.test(formatted) ? '12h' : '24h';
}

function getBrowserLocale(): string {
  if (typeof window === 'undefined') {
    return 'en-US';
  }
  return navigator.language || 'en-US';
}

function shouldUse12Hour(): boolean {
  const format = getUserTimeFormat();
  return format === '12h';
}

function formatDateParts(
  date: Date,
  timezone: string,
  dateFormat: DateFormat
): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const day = parts.find((p) => p.type === 'day')?.value || '01';
  const month = parts.find((p) => p.type === 'month')?.value || '01';
  const year = parts.find((p) => p.type === 'year')?.value || '2024';

  if (dateFormat === 'MM/DD/YYYY') {
    return `${month}/${day}/${year}`;
  }
  return `${day}/${month}/${year}`;
}

export function formatDateTime(
  dateStr: string | null | undefined,
  timezone?: string
): string {
  if (!dateStr) {
    return 'N/A';
  }

  try {
    const tz = timezone ?? getUserTimezone();
    const locale = getBrowserLocale();
    const use12Hour = shouldUse12Hour();
    const dateFormat = getUserDateFormat();
    const date = new Date(dateStr);

    const datePart = formatDateParts(date, tz, dateFormat);

    const timeFormatter = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: use12Hour,
    });

    const timePart = timeFormatter.format(date);

    return `${datePart} ${timePart}`;
  } catch {
    return 'N/A';
  }
}

export function formatDate(
  dateStr: string | null | undefined,
  timezone?: string
): string {
  if (!dateStr) {
    return 'N/A';
  }

  try {
    const tz = timezone ?? getUserTimezone();
    const dateFormat = getUserDateFormat();
    const date = new Date(dateStr);

    return formatDateParts(date, tz, dateFormat);
  } catch {
    return 'N/A';
  }
}

export function formatTime(
  dateStr: string | null | undefined,
  timezone?: string
): string {
  if (!dateStr) {
    return 'N/A';
  }

  try {
    const tz = timezone ?? getUserTimezone();
    const locale = getBrowserLocale();
    const use12Hour = shouldUse12Hour();

    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: use12Hour,
    });

    return formatter.format(new Date(dateStr));
  } catch {
    return 'N/A';
  }
}

export function formatDateTimeLong(
  dateStr: string | null | undefined,
  timezone?: string
): string {
  if (!dateStr) {
    return 'N/A';
  }

  try {
    const tz = timezone ?? getUserTimezone();
    const locale = getBrowserLocale();
    const use12Hour = shouldUse12Hour();
    const dateFormat = getUserDateFormat();
    const date = new Date(dateStr);

    const datePart = formatDateParts(date, tz, dateFormat);

    const timeFormatter = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: use12Hour,
    });

    const timePart = timeFormatter.format(date);

    return `${datePart} ${timePart}`;
  } catch {
    return 'N/A';
  }
}

export function formatDateTimeSeparate(
  dateStr: string | null | undefined,
  timezone?: string
): { date: string; time: string } {
  if (!dateStr) {
    return { date: 'N/A', time: 'N/A' };
  }

  return {
    date: formatDate(dateStr, timezone),
    time: formatTime(dateStr, timezone),
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
