import type { HttpClient } from '../client/http-client';
import type { OfflineQueue } from '../queue/offline-queue';
import { getItem, setItem } from '../storage/storage';
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

  constructor(
    httpClient: HttpClient,
    offlineQueue: OfflineQueue,
    getDeviceInfo: () => DeviceInfo,
    config?: PhaseConfig
  ) {
    this.httpClient = httpClient;
    this.offlineQueue = offlineQueue;
    this.getDeviceInfo = getDeviceInfo;
    this.collectDeviceInfo = config?.deviceInfo ?? true;
    this.collectLocale = config?.userLocale ?? true;
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
    const result = await getItem<string>(STORAGE_KEYS.DEVICE_ID);
    const stored = result.success ? result.data : null;

    if (stored) {
      const validation = validateDeviceId(stored);
      if (validation.success) {
        this.deviceId = stored;
      } else {
        logger.error('Stored device ID invalid, generating new one');
        this.deviceId = generateDeviceId();
        try {
          await setItem(STORAGE_KEYS.DEVICE_ID, this.deviceId);
        } catch {
          logger.error('Failed to persist device ID');
        }
      }
    } else {
      this.deviceId = generateDeviceId();
      try {
        await setItem(STORAGE_KEYS.DEVICE_ID, this.deviceId);
      } catch {
        logger.error('Failed to persist device ID');
      }
    }

    return this.deviceId;
  }

  async identify(
    isOnline: boolean,
    properties?: DeviceProperties
  ): Promise<void> {
    if (!this.deviceId) {
      logger.error('Device ID not set, call initialize() first');
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

    return {
      deviceId: this.deviceId,
      osVersion: this.collectDeviceInfo ? deviceInfo.osVersion : null,
      platform: this.collectDeviceInfo ? deviceInfo.platform : null,
      locale: this.collectLocale ? deviceInfo.locale : null,
      model: this.collectDeviceInfo ? deviceInfo.model : null,
      properties,
      disableGeolocation: !this.collectLocale,
    };
  }

  private async registerDevice(
    isOnline: boolean,
    properties?: DeviceProperties
  ): Promise<void> {
    const payload = this.buildDevicePayload(properties);
    if (!payload) {
      logger.error('Device ID not set, cannot register device');
      return;
    }

    if (isOnline) {
      try {
        const result = await this.httpClient.createDevice(payload);
        if (result.success) {
          await this.cacheDeviceInfo(payload);
        } else {
          logger.error('Failed to register device, queueing', result.error);
          try {
            await this.offlineQueue.enqueue({ type: 'device', payload });
          } catch (error) {
            logger.error('Failed to queue device registration', error);
          }
        }
      } catch (error) {
        logger.error('Exception during device registration, queueing', error);
        try {
          await this.offlineQueue.enqueue({ type: 'device', payload });
        } catch (queueError) {
          logger.error('Failed to queue device registration', queueError);
        }
      }
    } else {
      try {
        await this.offlineQueue.enqueue({ type: 'device', payload });
      } catch (error) {
        logger.error('Failed to queue device registration', error);
      }
    }
  }

  private async cacheDeviceInfo(payload: CreateDeviceRequest): Promise<void> {
    try {
      await setItem(STORAGE_KEYS.DEVICE_INFO, payload);
      logger.debug('Device info cached successfully');
    } catch {
      logger.error('Failed to cache device info');
    }
  }
}
