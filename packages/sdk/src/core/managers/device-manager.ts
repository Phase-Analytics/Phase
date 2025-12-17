import type { HttpClient } from '../client/http-client';
import type { OfflineQueue } from '../queue/offline-queue';
import { getItem, setItem } from '../storage/storage';
import type { CreateDeviceRequest, DeviceInfo, PhaseConfig } from '../types';
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

  async initialize(isOnline: boolean): Promise<string> {
    if (this.initPromise) {
      return this.initPromise;
    }
    if (this.deviceId) {
      return this.deviceId;
    }

    this.initPromise = this.doInitialize(isOnline);

    try {
      return await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async doInitialize(isOnline: boolean): Promise<string> {
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

    const shouldUpdate = await this.shouldUpdateDevice();
    if (shouldUpdate) {
      await this.registerDevice(isOnline);
    } else {
      logger.debug('Device info unchanged, skipping device POST');
    }

    return this.deviceId;
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }

  private buildDevicePayload(): CreateDeviceRequest | null {
    if (!this.deviceId) {
      return null;
    }

    const deviceInfo = this.getDeviceInfo();
    return {
      deviceId: this.deviceId,
      deviceType: this.collectDeviceInfo ? deviceInfo.deviceType : null,
      osVersion: this.collectDeviceInfo ? deviceInfo.osVersion : null,
      platform: this.collectDeviceInfo ? deviceInfo.platform : null,
      locale: this.collectLocale ? deviceInfo.locale : null,
      disableGeolocation: !this.collectLocale,
    };
  }

  private async shouldUpdateDevice(): Promise<boolean> {
    const current = this.buildDevicePayload();
    if (!current) {
      logger.error('Device ID not set, cannot check for updates');
      return false;
    }

    const result = await getItem<CreateDeviceRequest>(STORAGE_KEYS.DEVICE_INFO);
    const cached = result.success ? result.data : null;

    if (!cached) {
      logger.debug('No cached device info, will register device');
      return true;
    }

    const hasChanged =
      cached.deviceType !== current.deviceType ||
      cached.osVersion !== current.osVersion ||
      cached.platform !== current.platform ||
      cached.locale !== current.locale ||
      cached.disableGeolocation !== current.disableGeolocation;

    if (hasChanged) {
      logger.debug('Device info changed, will register device', {
        cached,
        current,
      });
    }

    return hasChanged;
  }

  private async registerDevice(isOnline: boolean): Promise<void> {
    const payload = this.buildDevicePayload();
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
          logger.error('Failed to register device, queueing');
          try {
            await this.offlineQueue.enqueue({ type: 'device', payload });
          } catch {
            logger.error('Failed to queue device registration');
          }
        }
      } catch {
        logger.error('Exception during device registration, queueing');
        try {
          await this.offlineQueue.enqueue({ type: 'device', payload });
        } catch {
          logger.error('Failed to queue device registration');
        }
      }
    } else {
      try {
        await this.offlineQueue.enqueue({ type: 'device', payload });
      } catch {
        logger.error('Failed to queue device registration');
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
