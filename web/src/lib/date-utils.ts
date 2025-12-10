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

export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) {
    return '0 seconds';
  }

  const totalSeconds = Math.floor(seconds);

  if (totalSeconds < 0) {
    return '—';
  }

  if (totalSeconds < 60) {
    return totalSeconds === 1 ? '1 sec' : `${totalSeconds} secs`;
  }

  if (totalSeconds < 3600) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    if (secs === 0) {
      return mins === 1 ? '1 min' : `${mins} mins`;
    }

    const minsPart = `${mins} ${mins === 1 ? 'min' : 'mins'}`;
    const secsPart = `${secs} ${secs === 1 ? 'sec' : 'secs'}`;
    return `${minsPart} ${secsPart}`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);

  const hoursPart = `${hours} hrs`;
  if (mins === 0) {
    return hoursPart;
  }

  const minsPart = `${mins} ${mins === 1 ? 'min' : 'mins'}`;
  return `${hoursPart} ${minsPart}`;
}
