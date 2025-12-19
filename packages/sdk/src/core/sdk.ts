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

  async init(
    config: PhaseConfig,
    getDeviceInfo: () => DeviceInfo,
    networkAdapter: NetworkAdapter
  ): Promise<void> {
    if (this.isInitialized) {
      logger.debug('SDK already initialized, skipping init');
      return;
    }

    if (this.isInitializing) {
      logger.debug('SDK initialization already in progress, skipping');
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
    } catch (error) {
      this.cleanup();
      logger.error('Failed to initialize SDK');
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Identify the current device with optional custom properties
   *
   * @param properties - Flat key-value pairs (string, number, boolean, or null only)
   *
   * @example
   * ```ts
   * Phase.identify({
   *   app_version: '1.2.3',
   *   user_tier: 'premium',
   *   notifications_enabled: true
   * });
   * ```
   */
  async identify(properties?: DeviceProperties): Promise<void> {
    if (!this.isInitialized) {
      logger.error('SDK not initialized. Call Phase.init() first.');
      return;
    }

    if (this.isIdentified) {
      logger.debug('Device already identified, skipping');
      return;
    }

    if (!(this.deviceManager && this.sessionManager && this.networkAdapter)) {
      logger.error('SDK components not ready');
      return;
    }

    const netState = await this.networkAdapter.fetchNetworkState();
    const isOnline = netState.isConnected ?? false;

    await this.deviceManager.identify(isOnline, properties);
    await this.sessionManager.start(isOnline);

    this.isIdentified = true;
    logger.info('Device identified and session started');
  }

  /**
   * Track a custom event
   *
   * @param name - Event name (alphanumeric, underscore, hyphen, dot, slash)
   * @param params - Flat key-value pairs (string, number, boolean, or null only)
   *
   * @example
   * ```ts
   * Phase.track('purchase', { amount: 99.99, currency: 'USD' });
   * ```
   */
  track(name: string, params?: EventParams): void {
    if (!this.isInitialized) {
      logger.error('SDK not initialized. Call Phase.init() first.');
      return;
    }

    if (!this.isIdentified) {
      logger.error('Device not identified. Call Phase.identify() first.');
      return;
    }

    if (!this.eventManager) {
      logger.error('Event manager not ready');
      return;
    }

    this.eventManager.track(name, params, false);
  }

  /**
   * Track a screen view
   *
   * @param name - Screen name
   * @param params - Flat key-value pairs (string, number, boolean, or null only)
   *
   * @example
   * ```ts
   * Phase.trackScreen('HomeScreen', { tab: 'explore' });
   * ```
   */
  trackScreen(name: string, params?: EventParams): void {
    if (!this.trackNavigationEvents) {
      logger.debug('Navigation tracking disabled via privacy config');
      return;
    }

    if (!this.isInitialized) {
      logger.error('SDK not initialized. Call Phase.init() first.');
      return;
    }

    if (!this.isIdentified) {
      logger.error('Device not identified. Call Phase.identify() first.');
      return;
    }

    if (!this.eventManager) {
      logger.error('Event manager not ready');
      return;
    }

    this.eventManager.track(name, params, true);
  }

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        logger.debug('App backgrounded, pausing session ping');
        this.sessionManager?.pause();
      } else if (state === 'active') {
        logger.debug('App foregrounded, resuming session ping');
        this.sessionManager?.resume().catch(() => {
          logger.error('Failed to resume session');
        });
      }
    });
  }

  private setupNetworkListener(): void {
    if (!this.networkAdapter) {
      logger.error('Network adapter not initialized');
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
          logger.info('Network restored, flushing offline queue');
          this.batchSender.flush().catch(() => {
            logger.error('Failed to flush offline queue');
          });
        }
      }
    );
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
  }
}
