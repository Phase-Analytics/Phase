import {
  addNetworkListener,
  fetchNetworkState,
} from './network/netinfo-network';
import { PhaseSDK } from './sdk';
import {
  clear,
  getItem,
  isAsyncStorageAvailable,
  removeItem,
  setItem,
} from './storage/async-storage';
import { setStorageAdapter } from './storage/storage';
import type {
  DeviceInfo,
  DeviceProperties,
  EventParams,
  PhaseConfig,
} from './types';
import { logger } from './utils/logger';

export type PlatformBindings = {
  getDeviceInfo: () => DeviceInfo;
  /** Optional native packages that are not installed. */
  missingPackages: () => string[];
  installCommand: string;
};

/**
 * Phase Analytics SDK. Calls made before `<PhaseProvider>` initializes are
 * buffered and run once it does.
 */
export type PhaseApi = {
  /**
   * Register device and start session. Events tracked before the first
   * identify() are buffered (up to 200) and sent afterwards.
   * @param properties Custom device attributes (optional)
   * @example
   * await Phase.identify({ user_id: '123', plan: 'premium' });
   */
  identify: (properties?: DeviceProperties) => Promise<void>;
  /**
   * Track custom event
   * @param name Event name (required, alphanumeric, `_`, `-`, `.`, `/`, space)
   * @param params Event parameters. Flat primitive object only. Max 32 keys. Keys max 32 chars. String values max 256 chars. Payload max 8 KB. Empty objects are normalized away.
   * @example
   * Phase.track('purchase', { amount: 99.99, currency: 'USD' });
   */
  track: (name: string, params?: EventParams) => Promise<void>;
  /**
   * Track a screen view manually (when not using `trackNavigation`)
   * @param name Screen name or path, e.g. `/settings/profile`
   * @param params Same rules as `track()` params (optional)
   */
  trackScreen: (name: string, params?: EventParams) => Promise<void>;
  /** Send queued data now. Resolves when the attempt finishes. */
  flush: () => Promise<void>;
  /**
   * Forget this device (e.g. on logout) and end the session. Data already
   * queued is still sent. Call identify() to start tracking again.
   */
  reset: () => Promise<void>;
};

/**
 * Process-wide SDK instance shared by the provider and the `Phase` API.
 * Calls made before the provider initializes (e.g. from child effects, which
 * run first) are buffered by the SDK and replayed after init.
 */
export function createPhase(bindings: PlatformBindings): {
  init: (config: PhaseConfig) => Promise<boolean>;
  Phase: PhaseApi;
} {
  let sdk: PhaseSDK | null = null;
  let initialization: Promise<boolean> | null = null;

  function ensureSDK(): PhaseSDK {
    if (!sdk) {
      sdk = new PhaseSDK();
    }
    return sdk;
  }

  async function start(config: PhaseConfig): Promise<boolean> {
    try {
      setStorageAdapter({ getItem, setItem, removeItem, clear });
      await ensureSDK().init(config, bindings.getDeviceInfo, {
        fetchNetworkState,
        addNetworkListener,
      });
    } catch (error) {
      logger.error('Initialization failed', error);
      // Allow a later provider mount (e.g. with a corrected API key) to retry.
      initialization = null;
      return false;
    }

    const missing = bindings.missingPackages();
    if (!isAsyncStorageAvailable()) {
      missing.push('@react-native-async-storage/async-storage');
    }
    if (missing.length > 0) {
      logger.info(
        `Optional packages not found: ${missing.join(', ')}. ` +
          `Install them for persistent storage and richer device info: ${bindings.installCommand} ${missing.join(' ')}`
      );
    }
    return true;
  }

  function init(config: PhaseConfig): Promise<boolean> {
    if (!initialization) {
      initialization = start(config);
    }
    return initialization;
  }

  async function run(label: string, action: () => unknown): Promise<void> {
    try {
      await action();
    } catch (error) {
      logger.error(`Failed to ${label}`, error);
    }
  }

  const Phase: PhaseApi = {
    identify: (properties) =>
      run('identify', () => ensureSDK().identify(properties)),
    track: (name, params) =>
      run('track event', () => ensureSDK().track(name, params)),
    trackScreen: (name, params) =>
      run('track screen', () => ensureSDK().trackScreen(name, params)),
    flush: () => run('flush', () => sdk?.flush()),
    reset: () => run('reset', () => sdk?.reset()),
  };

  return { init, Phase };
}
