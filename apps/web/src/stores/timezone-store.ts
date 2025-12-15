import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type TimeFormat = '12h' | '24h';
type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY';

type TimezoneStore = {
  timezone: string;
  timeFormat: TimeFormat;
  dateFormat: DateFormat;
  setTimezone: (timezone: string) => void;
  setTimeFormat: (format: TimeFormat) => void;
  setDateFormat: (format: DateFormat) => void;
  resetToDefault: () => void;
};

function getDefaultTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

const AM_PM_REGEX = /[ap]m/i;

function detectBrowserTimeFormat(): TimeFormat {
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
  });

  const testDate = new Date(2024, 0, 1, 13, 0, 0);
  const formatted = formatter.format(testDate);

  return AM_PM_REGEX.test(formatted) ? '12h' : '24h';
}

function detectBrowserDateFormat(): DateFormat {
  return 'DD/MM/YYYY';
}

export const useTimezoneStore = create<TimezoneStore>()(
  persist(
    (set) => ({
      timezone: getDefaultTimezone(),
      timeFormat: detectBrowserTimeFormat(),
      dateFormat: detectBrowserDateFormat(),
      setTimezone: (timezone: string) => set({ timezone }),
      setTimeFormat: (format: TimeFormat) => set({ timeFormat: format }),
      setDateFormat: (format: DateFormat) => set({ dateFormat: format }),
      resetToDefault: () =>
        set({
          timezone: getDefaultTimezone(),
          timeFormat: detectBrowserTimeFormat(),
          dateFormat: detectBrowserDateFormat(),
        }),
    }),
    {
      name: 'user-timezone',
    }
  )
);

export function shouldUse12Hour(preference: TimeFormat): boolean {
  return preference === '12h';
}

export type { DateFormat };
