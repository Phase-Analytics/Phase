import type { HttpClient } from '../client/http-client';
import type { OfflineQueue } from '../queue/offline-queue';
import { getItem, removeItem, setItem } from '../storage/storage';
import type {
  CreateDeviceRequest,
  DeviceInfo,
  DeviceProperties,
  PhaseConfig,
} from '../types';
import { STORAGE_KEYS } from '../types';
import { generateDeviceId } from '../utils/id-generator';
import { logger } from '../utils/logger';
import { validateDeviceId } from '../utils/validator';

export class DeviceManager {
  private deviceId: string | null = null;
  private initPromise: Promise<string> | null = null;
  private readonly httpClient: HttpClient;
  private readonly offlineQueue: OfflineQueue;
  private readonly getDeviceInfo: () => DeviceInfo;
  private readonly collectDeviceInfo: boolean;
  private readonly collectLocale: boolean;
  private readonly apiKey: string;

  constructor(
    httpClient: HttpClient,
    offlineQueue: OfflineQueue,
    getDeviceInfo: () => DeviceInfo,
    config: PhaseConfig
  ) {
    this.httpClient = httpClient;
    this.offlineQueue = offlineQueue;
    this.getDeviceInfo = getDeviceInfo;
    this.collectDeviceInfo = config?.deviceInfo ?? true;
    this.collectLocale = config?.userLocale ?? true;
    this.apiKey = config.apiKey;
  }

  async initialize(): Promise<string> {
    if (this.initPromise) {
      return this.initPromise;
    }
    if (this.deviceId) {
      return this.deviceId;
    }

    this.initPromise = this.doInitialize();

    try {
      return await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async doInitialize(): Promise<string> {
    const storedApiKeyResult = await getItem<string>(STORAGE_KEYS.API_KEY);
    const storedApiKey = storedApiKeyResult.success
      ? storedApiKeyResult.data
      : null;
    let shouldResetDevice = false;

    if (storedApiKey && storedApiKey !== this.apiKey) {
      logger.info('API key changed. Resetting device ID.');
      shouldResetDevice = true;

      try {
        await removeItem(STORAGE_KEYS.DEVICE_ID);
        await removeItem(STORAGE_KEYS.DEVICE_INFO);
      } catch {
        logger.error('Failed to clear old device data.');
      }
    }

    try {
      await setItem(STORAGE_KEYS.API_KEY, this.apiKey);
    } catch {
      logger.error('Failed to persist API key.');
    }

    const result = await getItem<string>(STORAGE_KEYS.DEVICE_ID);
    const stored = result.success ? result.data : null;

    if (!shouldResetDevice && stored) {
      const validation = validateDeviceId(stored);
      if (validation.success) {
        this.deviceId = stored;
      } else {
        logger.error('Stored device ID invalid. Generating new ID.');
        this.deviceId = generateDeviceId();
        try {
          await setItem(STORAGE_KEYS.DEVICE_ID, this.deviceId);
        } catch {
          logger.error('Failed to persist device ID. Storage unavailable.');
        }
      }
    } else {
      this.deviceId = generateDeviceId();
      try {
        await setItem(STORAGE_KEYS.DEVICE_ID, this.deviceId);
      } catch {
        logger.error('Failed to persist device ID. Storage unavailable.');
      }
    }

    return this.deviceId;
  }

  async identify(
    isOnline: boolean,
    properties?: DeviceProperties
  ): Promise<void> {
    if (!this.deviceId) {
      logger.error('Device ID not set. Call initialize() first.');
      return;
    }

    await this.registerDevice(isOnline, properties);
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }

  private buildDevicePayload(
    properties?: DeviceProperties
  ): CreateDeviceRequest | null {
    if (!this.deviceId) {
      return null;
    }

    const deviceInfo = this.getDeviceInfo();
    const mergedProperties = this.buildProperties(properties, deviceInfo);

    return {
      deviceId: this.deviceId,
      osVersion: this.collectDeviceInfo ? deviceInfo.osVersion : null,
      platform: this.collectDeviceInfo ? deviceInfo.platform : null,
      locale: this.collectLocale ? deviceInfo.locale : null,
      model: this.collectDeviceInfo ? deviceInfo.model : null,
      properties: mergedProperties,
      disableGeolocation: !this.collectLocale,
    };
  }

  private buildProperties(
    properties: DeviceProperties | undefined,
    deviceInfo: DeviceInfo
  ): DeviceProperties | undefined {
    if (!this.collectDeviceInfo) {
      return properties;
    }

    const appVersion = deviceInfo.appVersion?.trim();
    if (!appVersion) {
      return properties;
    }

    const autoProperties: DeviceProperties = {
      app_version: appVersion,
    };

    if (!properties) {
      return autoProperties;
    }

    return {
      ...autoProperties,
      ...properties,
    };
  }

  private async registerDevice(
    isOnline: boolean,
    properties?: DeviceProperties
  ): Promise<void> {
    const payload = this.buildDevicePayload(properties);
    if (!payload) {
      logger.error('Device ID not set. Cannot register device.');
      return;
    }

    if (isOnline) {
      try {
        const result = await this.httpClient.createDevice(payload);
        if (result.success) {
          await this.cacheDeviceInfo(payload);
        } else {
          logger.error(
            'Device registration failed. Queuing for retry.',
            result.error
          );
          try {
            await this.offlineQueue.enqueue({ type: 'device', payload });
          } catch (error) {
            logger.error(
              'Failed to queue device registration. Data may be lost.',
              error
            );
          }
        }
      } catch (error) {
        logger.error('Device registration error. Queuing for retry.', error);
        try {
          await this.offlineQueue.enqueue({ type: 'device', payload });
        } catch (queueError) {
          logger.error(
            'Failed to queue device registration. Data may be lost.',
            queueError
          );
        }
      }
    } else {
      try {
        await this.offlineQueue.enqueue({ type: 'device', payload });
      } catch (error) {
        logger.error(
          'Failed to queue device registration. Data may be lost.',
          error
        );
      }
    }
  }

  private async cacheDeviceInfo(payload: CreateDeviceRequest): Promise<void> {
    try {
      await setItem(STORAGE_KEYS.DEVICE_INFO, payload);
      logger.info('Device info cached successfully');
    } catch {
      logger.error('Failed to cache device info');
    }
  }
}
