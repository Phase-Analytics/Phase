import type { Result } from '../../core/types';
import { logger } from '../../core/utils/logger';

let AsyncStorage: unknown = null;

try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  // @react-native-async-storage/async-storage not available
}

const STORAGE_PREFIX = 'phase_analytics_';

function getStorageKey(key: string): string {
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${STORAGE_PREFIX}${safeKey}`;
}

export async function getItem<T>(key: string): Promise<Result<T | null>> {
  try {
    const storage = AsyncStorage as {
      getItem: (key: string) => Promise<string | null>;
    } | null;
    if (!storage?.getItem) {
      const err = new Error(
        '@react-native-async-storage/async-storage is not installed or not available'
      );
      logger.error('AsyncStorage not available', err);
      return { success: false, error: err };
    }

    const storageKey = getStorageKey(key);
    const content = await storage.getItem(storageKey);

    if (!content) {
      return { success: true, data: null };
    }

    try {
      return { success: true, data: JSON.parse(content) as T };
    } catch (parseError) {
      logger.error(
        `Corrupted storage data for "${key}". Clearing.`,
        parseError
      );
      await storage.getItem(storageKey);
      return { success: true, data: null };
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`Failed to read storage item "${key}"`, err);
    return { success: false, error: err };
  }
}

export async function setItem<T>(key: string, value: T): Promise<Result<void>> {
  try {
    const storage = AsyncStorage as {
      setItem: (key: string, value: string) => Promise<void>;
    } | null;
    if (!storage?.setItem) {
      const err = new Error(
        '@react-native-async-storage/async-storage is not installed or not available'
      );
      logger.error('AsyncStorage not available', err);
      return { success: false, error: err };
    }

    const storageKey = getStorageKey(key);
    const serialized = JSON.stringify(value);
    await storage.setItem(storageKey, serialized);
    return { success: true, data: undefined };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`Failed to write storage item "${key}"`, err);
    return { success: false, error: err };
  }
}

export async function removeItem(key: string): Promise<Result<void>> {
  try {
    const storage = AsyncStorage as {
      removeItem: (key: string) => Promise<void>;
    } | null;
    if (!storage?.removeItem) {
      const err = new Error(
        '@react-native-async-storage/async-storage is not installed or not available'
      );
      logger.error('AsyncStorage not available', err);
      return { success: false, error: err };
    }

    const storageKey = getStorageKey(key);
    await storage.removeItem(storageKey);
    return { success: true, data: undefined };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`Failed to remove storage item "${key}"`, err);
    return { success: false, error: err };
  }
}

export async function clear(): Promise<Result<void>> {
  try {
    const storage = AsyncStorage as {
      getAllKeys: () => Promise<string[]>;
      multiRemove: (keys: string[]) => Promise<void>;
    } | null;
    if (!(storage?.getAllKeys && storage?.multiRemove)) {
      const err = new Error(
        '@react-native-async-storage/async-storage is not installed or not available'
      );
      logger.error('AsyncStorage not available', err);
      return { success: false, error: err };
    }

    const allKeys = await storage.getAllKeys();
    const phaseKeys = allKeys.filter((k) => k.startsWith(STORAGE_PREFIX));

    if (phaseKeys.length > 0) {
      await storage.multiRemove(phaseKeys);
    }

    return { success: true, data: undefined };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to clear storage.', err);
    return { success: false, error: err };
  }
}
