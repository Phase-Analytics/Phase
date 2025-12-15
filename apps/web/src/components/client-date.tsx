'use client';

import {
  formatDate,
  formatDateTime,
  formatDateTimeLong,
  formatDuration,
  formatTime,
} from '@/lib/date-utils';

type DateFormat = 'datetime' | 'date' | 'time' | 'datetime-long';

type ClientDateProps = {
  date: string | null | undefined;
  format?: DateFormat;
  timezone?: string;
  className?: string;
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
}: ClientDateProps) {
  const formatters: Record<
    DateFormat,
    (d: string | null | undefined, tz?: string) => string
  > = {
    datetime: formatDateTime,
    date: formatDate,
    time: formatTime,
    'datetime-long': formatDateTimeLong,
  };

  const formatted = formatters[format](date, timezone);

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
