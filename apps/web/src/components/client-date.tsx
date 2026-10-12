'use client';

import {
  formatDate,
  formatDateTime,
  formatDateTimeLong,
  formatDuration,
  formatRelativeTime,
  formatTime,
} from '@/lib/date-utils';
import { useDateDisplayStore } from '@/stores/date-display-store';
import { useTimezoneStore } from '@/stores/timezone-store';

type DateFormat = 'datetime' | 'date' | 'time' | 'datetime-long';

type ClientDateProps = {
  date: string | null | undefined;
  format?: DateFormat;
  timezone?: string;
  className?: string;
  /** Force absolute/relative regardless of dashboard preference */
  display?: 'absolute' | 'relative' | 'auto';
};

type ClientDurationProps = {
  seconds: number | null;
  className?: string;
};

export function ClientDate({
  date,
  format = 'datetime',
  timezone,
  className,
  display = 'auto',
}: ClientDateProps) {
  const mode = useDateDisplayStore((s) => s.mode);
  const userTimezone = useTimezoneStore((s) => s.timezone);
  const dateFormat = useTimezoneStore((s) => s.dateFormat);
  const timeFormat = useTimezoneStore((s) => s.timeFormat);
  const useRelative =
    display === 'relative' || (display === 'auto' && mode === 'relative');

  if (useRelative && format !== 'time') {
    return (
      <span
        className={className}
        suppressHydrationWarning
        title={date ?? undefined}
      >
        {formatRelativeTime(date)}
      </span>
    );
  }

  const formatters: Record<DateFormat, typeof formatDateTime> = {
    datetime: formatDateTime,
    date: formatDate,
    time: formatTime,
    'datetime-long': formatDateTimeLong,
  };

  const formatted = formatters[format](date, {
    timezone: timezone ?? userTimezone,
    dateFormat,
    timeFormat,
  });

  return (
    <span className={className} suppressHydrationWarning>
      {formatted}
    </span>
  );
}

export function ClientDuration({ seconds, className }: ClientDurationProps) {
  const formatted = formatDuration(seconds);
  return (
    <span className={className} suppressHydrationWarning>
      {formatted}
    </span>
  );
}
