import { useCallback, useSyncExternalStore } from "react";

import { prefs } from "@/lib/prefs";

export function usePref<T>(
  key: string,
  defaultValue: T,
  parse: (value: unknown) => T | undefined
): [T, (value: T) => void] {
  const value = useSyncExternalStore(
    (listener) => prefs.subscribe(key, listener),
    () => prefs.get(key, defaultValue, parse),
    () => defaultValue
  );

  const setValue = useCallback(
    (next: T) => {
      prefs.set(key, next);
    },
    [key]
  );

  return [value, setValue];
}
