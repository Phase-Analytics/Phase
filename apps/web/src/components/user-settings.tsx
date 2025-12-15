'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useTimezoneStore } from '@/stores/timezone-store';

function getTimezoneOffset(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  });
  const parts = formatter.formatToParts(now);
  const offsetPart = parts.find((part) => part.type === 'timeZoneName');
  const offset = offsetPart?.value || '';
  return offset.replace('GMT', 'UTC');
}

function getTimezoneLabel(timezone: string): string {
  try {
    const offset = getTimezoneOffset(timezone);
    return `${offset} - ${timezone.replaceAll('_', ' ')}`;
  } catch {
    return timezone;
  }
}

const TIMEZONE_VALUES = [
  'Etc/GMT+12',
  'Pacific/Honolulu',
  'America/Anchorage',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Halifax',
  'America/Sao_Paulo',
  'America/Noronha',
  'Atlantic/Azores',
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Europe/Athens',
  'Europe/Istanbul',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Noumea',
  'Pacific/Auckland',
  'Pacific/Tongatapu',
];

type TimeFormat = '12h' | '24h';
type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY';

const TIME_FORMAT_OPTIONS: Array<{ value: TimeFormat; label: string }> = [
  { value: '12h', label: '12-hour' },
  { value: '24h', label: '24-hour' },
];

const DATE_FORMAT_OPTIONS: Array<{ value: DateFormat; label: string }> = [
  { value: 'DD/MM/YYYY', label: 'DD/MM' },
  { value: 'MM/DD/YYYY', label: 'MM/DD' },
];

type UserSettingsProps = {
  children: React.ReactNode;
};

export function UserSettings({ children }: UserSettingsProps) {
  const {
    timezone,
    timeFormat,
    dateFormat,
    setTimezone,
    setTimeFormat,
    setDateFormat,
    resetToDefault,
  } = useTimezoneStore();

  const handleTimezoneChange = (newTimezone: string) => {
    setTimezone(newTimezone);
  };

  const handleTimeFormatChange = (newFormat: TimeFormat) => {
    setTimeFormat(newFormat);
  };

  const handleDateFormatChange = (newFormat: DateFormat) => {
    setDateFormat(newFormat);
  };

  const handleReset = () => {
    resetToDefault();
  };

  const previewTime = useMemo(() => {
    const now = new Date();
    const locale = navigator.language || 'en-US';
    const use12Hour = timeFormat === '12h';

    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const dateParts = dateFormatter.formatToParts(now);
    const day = dateParts.find((p) => p.type === 'day')?.value || '01';
    const month = dateParts.find((p) => p.type === 'month')?.value || '01';
    const year = dateParts.find((p) => p.type === 'year')?.value || '2024';

    const datePart =
      dateFormat === 'MM/DD/YYYY'
        ? `${month}/${day}/${year}`
        : `${day}/${month}/${year}`;

    const timeFormatter = new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: use12Hour,
    });
    const timePart = timeFormatter.format(now);

    return `${datePart} ${timePart}`;
  }, [timezone, timeFormat, dateFormat]);

  const currentTimezoneLabel = getTimezoneLabel(timezone);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="sr-only">
          <DialogTitle>Time & Date Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-muted-foreground text-xs uppercase">
                  Timezone
                </h4>
                <p className="text-muted-foreground text-xs">
                  {currentTimezoneLabel}
                </p>
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                {TIMEZONE_VALUES.map((tz) => {
                  const offset = getTimezoneOffset(tz);
                  const label = tz.replaceAll('_', ' ');
                  return (
                    <button
                      className={`flex w-full items-center justify-between gap-3 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                        timezone === tz ? 'bg-accent font-medium' : ''
                      }`}
                      key={tz}
                      onClick={() => {
                        handleTimezoneChange(tz);
                      }}
                      type="button"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`size-4 rounded-full border-2 ${
                            timezone === tz
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground'
                          } flex items-center justify-center`}
                        >
                          {timezone === tz && (
                            <div className="size-2 rounded-full bg-primary-foreground" />
                          )}
                        </div>
                        <span>{label}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {offset}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <h4 className="font-semibold text-muted-foreground text-xs uppercase">
                    Time Format
                  </h4>
                </div>
                <div className="space-y-1 rounded-md border p-2">
                  {TIME_FORMAT_OPTIONS.map((option) => (
                    <button
                      className={`flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                        timeFormat === option.value
                          ? 'bg-accent font-medium'
                          : ''
                      }`}
                      key={option.value}
                      onClick={() => {
                        handleTimeFormatChange(option.value);
                      }}
                      type="button"
                    >
                      <div
                        className={`size-4 rounded-full border-2 ${
                          timeFormat === option.value
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground'
                        } flex items-center justify-center`}
                      >
                        {timeFormat === option.value && (
                          <div className="size-2 rounded-full bg-primary-foreground" />
                        )}
                      </div>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <h4 className="font-semibold text-muted-foreground text-xs uppercase">
                    Date Format
                  </h4>
                </div>
                <div className="space-y-1 rounded-md border p-2">
                  {DATE_FORMAT_OPTIONS.map((option) => (
                    <button
                      className={`flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                        dateFormat === option.value
                          ? 'bg-accent font-medium'
                          : ''
                      }`}
                      key={option.value}
                      onClick={() => {
                        handleDateFormatChange(option.value);
                      }}
                      type="button"
                    >
                      <div
                        className={`size-4 rounded-full border-2 ${
                          dateFormat === option.value
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground'
                        } flex items-center justify-center`}
                      >
                        {dateFormat === option.value && (
                          <div className="size-2 rounded-full bg-primary-foreground" />
                        )}
                      </div>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-muted-foreground text-xs uppercase">
                Preview
              </h4>
              <div className="rounded-md border bg-muted/50 p-3">
                <p className="text-sm">{previewTime}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleReset}
              size="sm"
              type="button"
              variant="ghost"
            >
              Reset to Browser Default
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
