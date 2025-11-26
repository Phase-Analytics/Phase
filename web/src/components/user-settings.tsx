'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

const TIME_FORMAT_OPTIONS: Array<{ value: TimeFormat; label: string }> = [
  { value: '12h', label: '12-hour' },
  { value: '24h', label: '24-hour' },
];

type UserSettingsProps = {
  children: React.ReactNode;
};

export function UserSettings({ children }: UserSettingsProps) {
  const { timezone, timeFormat, setTimezone, setTimeFormat, resetToDefault } =
    useTimezoneStore();

  const handleTimezoneChange = (newTimezone: string) => {
    setTimezone(newTimezone);
  };

  const handleTimeFormatChange = (newFormat: TimeFormat) => {
    setTimeFormat(newFormat);
  };

  const handleReset = () => {
    resetToDefault();
  };

  const previewTime = useMemo(() => {
    const now = new Date();
    const locale = navigator.language || 'en-US';
    const use12Hour = timeFormat === '12h';

    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: use12Hour,
    });

    return formatter.format(now);
  }, [timezone, timeFormat]);

  const currentTimezoneLabel = getTimezoneLabel(timezone);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>User Settings</DialogTitle>
          <DialogDescription>
            Customize your preferences and settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Time & Date Settings Category */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="font-semibold text-base">Time & Date</h3>
              <p className="text-muted-foreground text-xs">
                Configure how dates and times are displayed
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Timezone</h4>
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

            <div className="space-y-3">
              <div className="space-y-1">
                <h4 className="font-medium text-sm">Time Format</h4>
              </div>
              <div className="space-y-1 rounded-md border p-2">
                {TIME_FORMAT_OPTIONS.map((option) => (
                  <button
                    className={`flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                      timeFormat === option.value ? 'bg-accent font-medium' : ''
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

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Preview</h4>
              <div className="rounded-md border bg-muted/50 p-3">
                <p className="font-mono text-sm">{previewTime}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleReset} size="sm" type="button" variant="ghost">
            Reset to Browser Default
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
