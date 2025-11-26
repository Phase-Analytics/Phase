const AM_PM_REGEX = /[ap]m/i;

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

    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: use12Hour,
    });

    return formatter.format(new Date(dateStr));
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
    const locale = getBrowserLocale();

    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    return formatter.format(new Date(dateStr));
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

    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: use12Hour,
    });

    return formatter.format(new Date(dateStr));
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
