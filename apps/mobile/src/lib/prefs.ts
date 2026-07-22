import "expo-sqlite/localStorage/install";

type Listener = () => void;

const PREFIX = "prefs:";
const listeners = new Map<string, Set<Listener>>();

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => {
    listener();
  });
}

function readJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export const prefs = {
  get<T>(
    key: string,
    defaultValue: T,
    parse: (value: unknown) => T | undefined
  ): T {
    const raw = localStorage.getItem(`${PREFIX}${key}`);

    if (raw === null) {
      return defaultValue;
    }

    const parsed = readJson(raw);

    if (parsed === undefined) {
      return defaultValue;
    }

    return parse(parsed) ?? defaultValue;
  },

  set(key: string, value: unknown): void {
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
    notify(key);
  },

  remove(key: string): void {
    localStorage.removeItem(`${PREFIX}${key}`);
    notify(key);
  },

  subscribe(key: string, listener: Listener): () => void {
    const existing = listeners.get(key);

    if (existing) {
      existing.add(listener);
    } else {
      listeners.set(key, new Set([listener]));
    }

    return () => {
      listeners.get(key)?.delete(listener);
    };
  },
};
