import type { OfflineQueue } from '../queue/offline-queue';
import { getItem, removeItem, setItem } from '../storage/storage';
import type {
  CreateDeviceRequest,
  DeviceInfo,
  DeviceProperties,
  PhaseConfig,
} from '../types';
import { STORAGE_KEYS, VALIDATION } from '../types';
import { generateDeviceId } from '../utils/id-generator';
import { logger } from '../utils/logger';
import {
  limitLength,
  sanitizeDeviceProperties,
  validateDeviceId,
} from '../utils/validator';

export class DeviceManager {
  private deviceId: string | null = null;
  private readonly queue: OfflineQueue;
  private readonly getDeviceInfo: () => DeviceInfo;
  private readonly collectDeviceInfo: boolean;
  private readonly collectLocale: boolean;
  private readonly apiKey: string;

  constructor(
    queue: OfflineQueue,
    getDeviceInfo: () => DeviceInfo,
    config: PhaseConfig
  ) {
    this.queue = queue;
    this.getDeviceInfo = getDeviceInfo;
    this.collectDeviceInfo = config.deviceInfo ?? true;
    this.collectLocale = config.userLocale ?? true;
    this.apiKey = config.apiKey;
  }

  async initialize(): Promise<string> {
    const storedApiKey = await getItem<string>(STORAGE_KEYS.API_KEY);
    const apiKeyChanged =
      storedApiKey.success &&
      storedApiKey.data !== null &&
      storedApiKey.data !== this.apiKey;

    if (apiKeyChanged) {
      // Queued items belong to the old device/app; the server would 403 a
      // batch mixing them with the new device.
      logger.info('API key changed. Resetting device ID and offline queue.');
      await this.queue.clear();
      await removeItem(STORAGE_KEYS.DEVICE_ID);
      await removeItem(STORAGE_KEYS.DEVICE_INFO);
    }

    const persistKey = await setItem(STORAGE_KEYS.API_KEY, this.apiKey);
    if (!persistKey.success) {
      logger.error('Failed to persist API key.');
    }

    const stored = apiKeyChanged
      ? null
      : await getItem<string>(STORAGE_KEYS.DEVICE_ID);
    const storedId = stored?.success ? stored.data : null;

    if (storedId && validateDeviceId(storedId).success) {
      this.deviceId = storedId;
      return storedId;
    }

    if (storedId) {
      logger.error('Stored device ID invalid. Generating new ID.');
    }
    return await this.assignNewDeviceId();
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }

  /** Queues a device upsert; the batch endpoint creates it before sessions/events. */
  identify(properties?: DeviceProperties): void {
    if (!this.deviceId) {
      logger.error('Device ID not set. Call initialize() first.');
      return;
    }

    this.queue.enqueue({
      type: 'device',
      payload: this.buildPayload(this.deviceId, properties),
    });
  }

  /** Forgets this device. The next identify() registers a brand-new device. */
  async reset(): Promise<void> {
    await removeItem(STORAGE_KEYS.DEVICE_INFO);
    await this.assignNewDeviceId();
  }

  private async assignNewDeviceId(): Promise<string> {
    const deviceId = generateDeviceId();
    this.deviceId = deviceId;
    const result = await setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    if (!result.success) {
      logger.error('Failed to persist device ID. Storage unavailable.');
    }
    return deviceId;
  }

  private buildPayload(
    deviceId: string,
    properties?: DeviceProperties
  ): CreateDeviceRequest {
    const deviceInfo = this.getDeviceInfo();
    const sanitized = sanitizeDeviceProperties(properties);
    if (sanitized.droppedKeys.length > 0) {
      logger.error(
        'Invalid identify() properties dropped. Use flat primitive values, keys up to 128 chars, 50 KB total.',
        { keys: sanitized.droppedKeys }
      );
    }

    return {
      deviceId,
      osVersion: this.collectDeviceInfo
        ? limitLength(deviceInfo.osVersion, VALIDATION.VERSION.OS_VERSION_MAX_LENGTH)
        : null,
      platform: this.collectDeviceInfo ? deviceInfo.platform : null,
      locale: this.collectLocale
        ? limitLength(deviceInfo.locale, VALIDATION.LOCALE.MAX_LENGTH)
        : null,
      model: this.collectDeviceInfo
        ? limitLength(deviceInfo.model, VALIDATION.MODEL.MAX_LENGTH)
        : null,
      properties: this.buildProperties(sanitized.properties, deviceInfo),
      disableGeolocation: !this.collectLocale,
    };
  }

  private buildProperties(
    properties: DeviceProperties | undefined,
    deviceInfo: DeviceInfo
  ): DeviceProperties | undefined {
    const appVersion = this.collectDeviceInfo
      ? deviceInfo.appVersion?.trim()
      : undefined;
    if (!appVersion) {
      return properties;
    }
    return { app_version: appVersion, ...properties };
  }
}
