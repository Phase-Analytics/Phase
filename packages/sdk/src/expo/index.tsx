import { usePathname, useSegments } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addNetworkListener,
  fetchNetworkState,
} from '../core/network/netinfo-network';
import { PhaseSDK } from '../core/sdk';
import {
  clear,
  getItem,
  removeItem,
  setItem,
} from '../core/storage/async-storage';
import { setStorageAdapter } from '../core/storage/storage';
import type { DeviceProperties, EventParams, PhaseConfig } from '../core/types';
import { logger } from '../core/utils/logger';
import { getExpoDeviceInfo } from './device/expo-device-info';

let sdk: PhaseSDK | null = null;
let initializationPromise: Promise<boolean> | null = null;
const readyCallbacks: (() => void)[] = [];

function getSDK(): PhaseSDK | null {
  return sdk;
}

function ensureSDK(): PhaseSDK {
  if (!sdk) {
    sdk = new PhaseSDK();
  }
  return sdk;
}

function initSDK(config: PhaseConfig): Promise<boolean> {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      const missingPackages: string[] = [];

      try {
        require('expo-device');
      } catch {
        missingPackages.push('expo-device');
      }

      try {
        require('expo-localization');
      } catch {
        missingPackages.push('expo-localization');
      }

      try {
        require('@react-native-async-storage/async-storage');
      } catch {
        missingPackages.push('@react-native-async-storage/async-storage');
      }

      if (missingPackages.length > 0) {
        logger.info(
          `Optional Expo packages not found: ${missingPackages.join(', ')}\n` +
            'For better device info and storage, install them:\n' +
            `  npx expo install ${missingPackages.join(' ')}`
        );
      }

      setStorageAdapter({
        getItem,
        setItem,
        removeItem,
        clear,
      });

      const networkAdapter = {
        fetchNetworkState,
        addNetworkListener,
      };

      await ensureSDK().init(config, getExpoDeviceInfo, networkAdapter);

      for (const callback of readyCallbacks) {
        callback();
      }
      readyCallbacks.length = 0;

      return true;
    } catch (error) {
      logger.error('Initialization failed', error);
      initializationPromise = null;
      return false;
    }
  })();

  return initializationPromise;
}

function onSDKReady(callback: () => void): void {
  if (initializationPromise) {
    initializationPromise.then((success) => {
      if (success) {
        callback();
      }
    });
  } else {
    readyCallbacks.push(callback);
  }
}

type PhaseProps = PhaseConfig & {
  children: ReactNode;
};

function NavigationTracker(): ReactNode {
  const pathname = usePathname();
  const segments = useSegments();
  const segmentsKey = useMemo(() => segments.join('/'), [segments]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    onSDKReady(() => {
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const instance = getSDK();
    if (!instance) {
      return;
    }

    const screenName = pathname || segmentsKey || 'unknown';
    instance.trackScreen(screenName);
  }, [isReady, pathname, segmentsKey]);

  return null;
}

/**
 * Phase Analytics provider for Expo Router
 * @param apiKey Phase API key (required, starts with `phase_`)
 * @param children App content (required)
 * @param trackNavigation Auto-track screens (optional, default: false)
 * @param baseUrl Custom API endpoint (optional, default: "https://api.phase.sh")
 * @param logLevel Logging level (optional, info, warn, error, none, default: "none")
 * @param deviceInfo Collect device metadata (optional, default: true)
 * @param userLocale Collect locale & geolocation (optional, default: true)
 * @example
 * <PhaseProvider apiKey="phase_xxx">
 *   <Stack />
 * </PhaseProvider>
 */
function PhaseProvider({
  children,
  apiKey,
  baseUrl,
  logLevel,
  trackNavigation = false,
  deviceInfo,
  userLocale,
}: PhaseProps): ReactNode {
  const initStarted = useRef(false);

  useEffect(() => {
    if (initStarted.current) {
      return;
    }
    initStarted.current = true;

    const config: PhaseConfig = {
      apiKey,
      baseUrl,
      logLevel,
      trackNavigation,
      deviceInfo,
      userLocale,
    };

    initSDK(config);

    return () => {
      initStarted.current = false;
    };
  }, [apiKey, baseUrl, deviceInfo, logLevel, trackNavigation, userLocale]);

  return (
    <>
      {trackNavigation && <NavigationTracker />}
      {children}
    </>
  );
}

/**
 * Register device and start session
 * @param properties Custom device attributes (optional)
 * @example
 * // Basic usage
 * await Phase.identify();
 *
 * // After login
 * await Phase.identify({ user_id: '123', plan: 'premium' });
 */
async function identify(properties?: DeviceProperties): Promise<void> {
  try {
    if (initializationPromise) {
      await initializationPromise;
    }

    const instance = getSDK();
    if (!instance) {
      logger.error('SDK not initialized. Wrap your app with <PhaseProvider>.');
      return;
    }
    await instance.identify(properties);
  } catch (error) {
    logger.error('Failed to identify', error);
  }
}

/**
 * Track custom event
 * @param name Event name (required, alphanumeric, `_`, `-`, `.`, `/`, space)
 * @param params Event parameters (optional, primitives only)
 * @example
 * await Phase.track('purchase', { amount: 99.99, currency: 'USD' });
 */
async function track(name: string, params?: EventParams): Promise<void> {
  try {
    if (initializationPromise) {
      await initializationPromise;
    }

    const instance = getSDK();
    if (!instance) {
      logger.error('SDK not initialized. Wrap your app with <PhaseProvider>.');
      return;
    }
    instance.track(name, params);
  } catch (error) {
    logger.error('Failed to track event', error);
  }
}

/**
 * Phase Analytics SDK
 *
 * @example
 * import { Phase } from 'phase-analytics/expo';
 *
 * // Identify device
 * await Phase.identify({ user_id: '123' });
 *
 * // Track events
 * Phase.track('purchase', { amount: 99.99 });
 */
const Phase = {
  identify,
  track,
};

export { PhaseProvider, Phase };
export type { DeviceProperties, EventParams, PhaseConfig } from '../core/types';
