import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Result } from '../types';
import { STORAGE_KEYS } from '../types';
import { logger } from '../utils/logger';

export async function getItem<T>(key: string): Promise<Result<T | null>> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value === null) {
      return { success: true, data: null };
    }

    try {
      return { success: true, data: JSON.parse(value) as T };
    } catch (parseError) {
      logger.error(
        `Corrupted JSON in storage for key: ${key}, clearing`,
        parseError
      );
      await AsyncStorage.removeItem(key);
      return { success: true, data: null };
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`Failed to get item from storage: ${key}`, err);
    return { success: false, error: err };
  }
}

export async function setItem<T>(key: string, value: T): Promise<Result<void>> {
  try {
    const serialized = JSON.stringify(value);
    await AsyncStorage.setItem(key, serialized);
    return { success: true, data: undefined };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`Failed to set item in storage: ${key}`, err);
    return { success: false, error: err };
  }
}

export async function removeItem(key: string): Promise<Result<void>> {
  try {
    await AsyncStorage.removeItem(key);
    return { success: true, data: undefined };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`Failed to remove item from storage: ${key}`, err);
    return { success: false, error: err };
  }
}

/**
 * Clear all Phase SDK data from AsyncStorage.
 *
 * IMPORTANT: This only removes Phase SDK keys, NOT all AsyncStorage data.
 * Safe to call without affecting other app data or third-party libraries.
 */
export async function clearPhaseData(): Promise<Result<void>> {
  try {
    const phaseKeys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(phaseKeys);
    logger.debug('Cleared Phase SDK storage', { keys: phaseKeys });
    return { success: true, data: undefined };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to clear Phase SDK storage', err);
    return { success: false, error: err };
  }
}
