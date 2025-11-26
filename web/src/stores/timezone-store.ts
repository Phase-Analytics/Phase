import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type TimeFormat = '12h' | '24h';

type TimezoneStore = {
  timezone: string;
  timeFormat: TimeFormat;
  setTimezone: (timezone: string) => void;
  setTimeFormat: (format: TimeFormat) => void;
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

export const useTimezoneStore = create<TimezoneStore>()(
  persist(
    (set) => ({
      timezone: getDefaultTimezone(),
      timeFormat: detectBrowserTimeFormat(),
      setTimezone: (timezone: string) => set({ timezone }),
      setTimeFormat: (format: TimeFormat) => set({ timeFormat: format }),
      resetToDefault: () =>
        set({
          timezone: getDefaultTimezone(),
          timeFormat: detectBrowserTimeFormat(),
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
