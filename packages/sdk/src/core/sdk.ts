import { AppState } from 'react-native';
import type { NetworkAdapter } from './adapters/network-adapter';
import { HttpClient } from './client/http-client';
import { DeviceManager } from './managers/device-manager';
import { EventManager } from './managers/event-manager';
import { SessionManager } from './managers/session-manager';
import { BatchSender } from './queue/batch-sender';
import { OfflineQueue } from './queue/offline-queue';
import type {
  DeviceInfo,
  DeviceProperties,
  EventParams,
  PhaseConfig,
} from './types';
import { logger } from './utils/logger';

export class PhaseSDK {
  private httpClient: HttpClient | null = null;
  private offlineQueue: OfflineQueue | null = null;
  private batchSender: BatchSender | null = null;
  private deviceManager: DeviceManager | null = null;
  private sessionManager: SessionManager | null = null;
  private eventManager: EventManager | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private isIdentified = false;
  private unsubscribeNetInfo: (() => void) | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private trackNavigationEvents = true;
  private networkAdapter: NetworkAdapter | null = null;
  private pendingCalls: Array<() => Promise<void> | void> = [];

  async init(
    config: PhaseConfig,
    getDeviceInfo: () => DeviceInfo,
    networkAdapter: NetworkAdapter
  ): Promise<void> {
    if (this.isInitialized) {
      logger.warn(
        'SDK already initialized. Skipping duplicate initialization.'
      );
      return;
    }

    if (this.isInitializing) {
      logger.warn(
        'SDK initialization already in progress. Skipping duplicate call.'
      );
      return;
    }

    this.isInitializing = true;

    logger.setLogLevel(config.logLevel ?? 'none');
    this.trackNavigationEvents = config.trackNavigation ?? true;

    if (!config.apiKey || config.apiKey.trim().length === 0) {
      this.isInitializing = false;
      logger.error('API key is required. Please provide a valid API key.');
      throw new Error('API key is required');
    }

    if (!config.apiKey.startsWith('phase_')) {
      this.isInitializing = false;
      logger.error('Invalid API key format. API key must start with "phase_"', {
        providedKey: `${config.apiKey.substring(0, 8)}...`,
      });
      throw new Error('Invalid API key format');
    }

    try {
      logger.info('Initializing Phase SDK', { baseUrl: config.baseUrl });
      this.networkAdapter = networkAdapter;

      this.httpClient = new HttpClient(
        config.apiKey,
        config.baseUrl ?? 'https://api.phase.sh'
      );
      this.offlineQueue = new OfflineQueue();
      await this.offlineQueue.initialize();

      this.batchSender = new BatchSender(this.httpClient, this.offlineQueue);

      this.deviceManager = new DeviceManager(
        this.httpClient,
        this.offlineQueue,
        getDeviceInfo,
        config
      );
      const deviceId = await this.deviceManager.initialize();

      this.sessionManager = new SessionManager(
        this.httpClient,
        this.offlineQueue,
        deviceId
      );

      this.eventManager = new EventManager(
        this.httpClient,
        this.offlineQueue,
        () => this.sessionManager?.getSessionId() ?? null
      );

      this.setupNetworkListener();
      this.setupAppStateListener();

      this.isInitialized = true;
      logger.info(
        'Phase SDK initialized successfully. Call identify() to start tracking.'
      );

      await this.processPendingCalls();
    } catch (error) {
      this.cleanup();
      logger.error('Failed to initialize SDK');
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async identify(properties?: DeviceProperties): Promise<void> {
    if (!this.isInitialized) {
      logger.warn('SDK not initialized. Queuing identify() call.');
      return new Promise((resolve, reject) => {
        this.pendingCalls.push(async () => {
          try {
            await this.identify(properties);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    if (!(this.deviceManager && this.sessionManager && this.networkAdapter)) {
      logger.error('SDK components not ready. Initialization may have failed.');
      return;
    }

    const netState = await this.networkAdapter.fetchNetworkState();
    const isOnline = netState.isConnected ?? false;

    await this.deviceManager.identify(isOnline, properties);
    await this.sessionManager.start(isOnline);

    this.isIdentified = true;
    logger.info('Device identified and session started');

    await this.processPendingCalls();

    if (isOnline && this.offlineQueue && this.batchSender) {
      const queueSize = this.offlineQueue.getSize();
      if (queueSize > 0) {
        logger.info(
          `Flushing offline queue after identification (${queueSize} items)`
        );
        this.batchSender.flush().catch(() => {
          logger.error('Failed to flush offline queue. Will retry later.');
        });
      }
    }
  }

  track(name: string, params?: EventParams): void {
    if (!this.isInitialized) {
      logger.warn('SDK not initialized. Queuing track() call.');
      this.pendingCalls.push(() => {
        this.track(name, params);
      });
      return;
    }

    if (!this.isIdentified) {
      logger.warn('Device not identified. Queuing track() call.');
      this.pendingCalls.push(() => {
        this.track(name, params);
      });
      return;
    }

    if (!this.eventManager) {
      logger.error('Event manager not ready. Initialization may have failed.');
      return;
    }

    this.eventManager.track(name, params, false);
  }

  trackScreen(name: string, params?: EventParams): void {
    if (!this.trackNavigationEvents) {
      return;
    }

    if (!this.isInitialized) {
      logger.warn('SDK not initialized. Queuing trackScreen() call.');
      this.pendingCalls.push(() => {
        this.trackScreen(name, params);
      });
      return;
    }

    if (!this.isIdentified) {
      logger.warn('Device not identified. Queuing trackScreen() call.');
      this.pendingCalls.push(() => {
        this.trackScreen(name, params);
      });
      return;
    }

    if (!this.eventManager) {
      logger.error('Event manager not ready. Initialization may have failed.');
      return;
    }

    this.eventManager.track(name, params, true);
  }

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        logger.info('App backgrounded. Pausing session ping.');
        this.sessionManager?.pause();
      } else if (state === 'active') {
        logger.info('App foregrounded. Resuming session ping.');
        this.sessionManager?.resume().catch(() => {
          logger.error('Failed to resume session');
        });
      }
    });
  }

  private setupNetworkListener(): void {
    if (!this.networkAdapter) {
      logger.error(
        'Network adapter not initialized. Initialization may have failed.'
      );
      return;
    }

    this.unsubscribeNetInfo = this.networkAdapter.addNetworkListener(
      (state) => {
        const isOnline = state.isConnected ?? false;

        if (this.sessionManager) {
          this.sessionManager.updateNetworkState(isOnline);
        }

        if (this.eventManager) {
          this.eventManager.updateNetworkState(isOnline);
        }

        if (
          isOnline &&
          this.isIdentified &&
          this.batchSender &&
          this.offlineQueue &&
          this.offlineQueue.getSize() > 0
        ) {
          logger.info('Network restored. Flushing offline queue.');
          this.batchSender.flush().catch(() => {
            logger.error('Failed to flush offline queue. Will retry later.');
          });
        }
      }
    );
  }

  private async processPendingCalls(): Promise<void> {
    if (this.pendingCalls.length === 0) {
      return;
    }

    logger.info(`Processing ${this.pendingCalls.length} queued calls`);
    const calls = [...this.pendingCalls];
    this.pendingCalls = [];

    for (const call of calls) {
      try {
        await call();
      } catch (error) {
        logger.error('Failed to process queued call. Call may be lost.', error);
      }
    }
  }

  private cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }

    this.sessionManager?.pause();
    this.httpClient = null;
    this.offlineQueue = null;
    this.batchSender = null;
    this.deviceManager = null;
    this.sessionManager = null;
    this.eventManager = null;
    this.isInitialized = false;
    this.isIdentified = false;
    this.pendingCalls = [];
  }
}
