import { AppState } from 'react-native';
import type { NetworkAdapter } from './adapters/network-adapter';
import { HttpClient } from './client/http-client';
import { DeviceManager } from './managers/device-manager';
import { EventManager } from './managers/event-manager';
import { SessionManager } from './managers/session-manager';
import { BatchSender } from './queue/batch-sender';
import { FlushScheduler } from './queue/flush-scheduler';
import { OfflineQueue } from './queue/offline-queue';
import type {
  DeviceInfo,
  DeviceProperties,
  EventParams,
  PhaseConfig,
} from './types';
import { logger } from './utils/logger';

const DEFAULT_BASE_URL = 'https://api.phase.sh';

type Components = {
  queue: OfflineQueue;
  scheduler: FlushScheduler;
  device: DeviceManager;
  session: SessionManager;
};

type PendingIdentify = { properties?: DeviceProperties };

export class PhaseSDK {
  // Exists before init so track() calls made before init are captured, not dropped.
  private readonly events = new EventManager();
  private components: Components | null = null;
  private initializing = false;
  private pendingIdentify: PendingIdentify | null = null;
  private resetting: Promise<void> | null = null;
  private unsubscribeNetwork: (() => void) | null = null;
  private appStateSubscription: { remove: () => void } | null = null;

  async init(
    config: PhaseConfig,
    getDeviceInfo: () => DeviceInfo,
    networkAdapter: NetworkAdapter
  ): Promise<void> {
    if (this.components || this.initializing) {
      logger.warn('SDK already initialized or initializing. Skipping.');
      return;
    }

    logger.setLogLevel(config.logLevel ?? 'none');

    if (!config.apiKey || config.apiKey.trim().length === 0) {
      logger.error('API key is required. Please provide a valid API key.');
      throw new Error('API key is required');
    }

    if (!config.apiKey.startsWith('phase_')) {
      logger.error('Invalid API key format. API key must start with "phase_"', {
        providedKey: `${config.apiKey.substring(0, 8)}...`,
      });
      throw new Error('Invalid API key format');
    }

    this.initializing = true;
    try {
      logger.info('Initializing Phase SDK', { baseUrl: config.baseUrl });

      const httpClient = new HttpClient(
        config.apiKey,
        config.baseUrl ?? DEFAULT_BASE_URL,
        config.debugData ?? false
      );
      const queue = new OfflineQueue();
      await queue.initialize();

      const device = new DeviceManager(queue, getDeviceInfo, config);
      await device.initialize();

      const session = new SessionManager(queue, () => device.getDeviceId());
      const scheduler = new FlushScheduler(
        new BatchSender(httpClient, queue),
        queue
      );

      this.components = { queue, scheduler, device, session };
      await this.setupNetworkListener(networkAdapter, scheduler);
      this.setupAppStateListener(session, scheduler);
      scheduler.start();

      logger.info('Phase SDK initialized. Call identify() to start tracking.');

      const pending = this.pendingIdentify;
      this.pendingIdentify = null;
      if (pending) {
        this.identifyNow(pending.properties);
      }
    } catch (error) {
      this.teardown();
      this.pendingIdentify = null;
      logger.error('Failed to initialize SDK', error);
      throw error;
    } finally {
      this.initializing = false;
    }
  }

  async identify(properties?: DeviceProperties): Promise<void> {
    if (this.resetting) {
      await this.resetting;
    }

    if (!this.components) {
      logger.info('SDK not initialized yet. identify() will run after init.');
      // Server merges device properties, so merging queued calls is equivalent.
      this.pendingIdentify = {
        properties:
          properties || this.pendingIdentify?.properties
            ? { ...this.pendingIdentify?.properties, ...properties }
            : undefined,
      };
      return;
    }

    this.identifyNow(properties);
  }

  track(name: string, params?: EventParams): void {
    this.events.track(name, params, false);
  }

  trackScreen(name: string, params?: EventParams): void {
    this.events.track(name, params, true);
  }

  /** Sends queued data now. Resolves when the flush finishes. */
  async flush(): Promise<void> {
    await this.components?.scheduler.flushNow();
  }

  /**
   * Forgets the current device (e.g. on logout): ends the session, tries to
   * deliver queued data, clears the queue and generates a new device ID.
   * Call identify() again to start tracking the new device.
   */
  reset(): Promise<void> {
    if (!this.resetting) {
      this.resetting = this.performReset().finally(() => {
        this.resetting = null;
      });
    }
    return this.resetting;
  }

  private async performReset(): Promise<void> {
    this.pendingIdentify = null;
    const components = this.components;
    if (!components) {
      logger.warn('reset() called before initialization. Nothing to reset.');
      return;
    }

    const { device, session, queue, scheduler } = components;
    this.events.detach();
    session.end();

    await scheduler.flushNow();
    const unsent = queue.getSize();
    if (unsent > 0) {
      logger.warn(`reset() discarded ${unsent} unsent item(s).`);
    }
    await queue.clear();
    await device.reset();
    logger.info('SDK reset. Call identify() to start tracking again.');
  }

  private identifyNow(properties?: DeviceProperties): void {
    if (!this.components) {
      return;
    }
    const { device, session, queue, scheduler } = this.components;

    device.identify(properties);
    session.start(this.events.getEarliestPendingMs());
    this.events.attach({
      queue,
      getSessionId: () => session.getSessionId(),
      markActivity: () => session.markActivity(),
    });
    scheduler.requestFlush();
    logger.info('Device identified and session started');
  }

  private setupAppStateListener(
    session: SessionManager,
    scheduler: FlushScheduler
  ): void {
    this.appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        session.pause();
        scheduler.onBackground().catch(() => undefined);
      } else if (state === 'active') {
        session.resume();
        scheduler.onForeground();
      }
    });
  }

  private async setupNetworkListener(
    adapter: NetworkAdapter,
    scheduler: FlushScheduler
  ): Promise<void> {
    try {
      const state = await adapter.fetchNetworkState();
      scheduler.setOnline(state.isConnected);
    } catch {
      scheduler.setOnline(true);
    }
    this.unsubscribeNetwork = adapter.addNetworkListener((state) => {
      scheduler.setOnline(state.isConnected);
    });
  }

  private teardown(): void {
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    this.unsubscribeNetwork?.();
    this.unsubscribeNetwork = null;
    this.components?.scheduler.stop();
    this.components?.session.end();
    this.components = null;
  }
}
