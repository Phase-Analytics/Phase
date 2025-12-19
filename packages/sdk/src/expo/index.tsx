import { usePathname, useSegments } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PhaseSDK } from '../core/sdk';
import { setStorageAdapter } from '../core/storage/storage';
import type { DeviceProperties, EventParams, PhaseConfig } from '../core/types';
import { logger } from '../core/utils/logger';
import { getExpoDeviceInfo } from './device/expo-device-info';
import { addNetworkListener, fetchNetworkState } from './network/expo-network';
import { clear, getItem, removeItem, setItem } from './storage/expo-storage';

let sdk: PhaseSDK | null = null;

function getSDK(): PhaseSDK | null {
  return sdk;
}

function ensureSDK(): PhaseSDK {
  if (!sdk) {
    sdk = new PhaseSDK();
  }
  return sdk;
}

async function initSDK(config: PhaseConfig): Promise<boolean> {
  try {
    const missingPackages: string[] = [];

    try {
      require('expo-constants');
    } catch {
      missingPackages.push('expo-constants');
    }

    try {
      require('expo-application');
    } catch {
      missingPackages.push('expo-application');
    }

    try {
      require('expo-localization');
    } catch {
      missingPackages.push('expo-localization');
    }

    if (missingPackages.length > 0) {
      logger.info(
        `Optional Expo packages not found: ${missingPackages.join(', ')}\n` +
          'For better device info, install them:\n' +
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
    return true;
  } catch (error) {
    logger.error('Initialization failed', error);
    return false;
  }
}

type PhaseProps = PhaseConfig & {
  children: ReactNode;
};

function NavigationTracker({
  initialized,
}: {
  initialized: boolean;
}): ReactNode {
  const pathname = usePathname();
  const segments = useSegments();
  const segmentsKey = useMemo(() => segments.join('/'), [segments]);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    const instance = getSDK();
    if (!instance) {
      return;
    }

    const screenName = pathname || segmentsKey || 'unknown';
    instance.trackScreen(screenName);
  }, [initialized, pathname, segmentsKey]);

  return null;
}

/**
 * Phase Analytics provider for Expo Router
 * @param apiKey Phase API key (required, starts with `phase_`)
 * @param children App content (required)
 * @param trackNavigation Auto-track screens (optional, default: false)
 * @param baseUrl Custom API endpoint (optional, default: "https://api.phase.sh")
 * @param logLevel Logging level (optional, default: "none")
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
  const [initialized, setInitialized] = useState(false);
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

    let isMounted = true;
    initSDK(config).then((success) => {
      if (isMounted) {
        setInitialized(success);
      }
    });

    return () => {
      isMounted = false;
      initStarted.current = false;
    };
  }, [apiKey, baseUrl, deviceInfo, logLevel, trackNavigation, userLocale]);

  return (
    <>
      {trackNavigation && <NavigationTracker initialized={initialized} />}
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
  const instance = getSDK();
  if (!instance) {
    logger.error('SDK not initialized. Wrap your app with <Phase>.');
    return;
  }
  await instance.identify(properties);
}

/**
 * Track custom event
 * @param name Event name (required, alphanumeric, `_`, `-`, `.`, `/`)
 * @param params Event parameters (optional, primitives only)
 * @example
 * Phase.track('purchase', { amount: 99.99, currency: 'USD' });
 */
function track(name: string, params?: EventParams): void {
  const instance = getSDK();
  if (!instance) {
    logger.error('SDK not initialized. Wrap your app with <Phase>.');
    return;
  }
  instance.track(name, params);
}

/**
 * Phase Analytics SDK
 *
 * @example
 * import { Phase } from '@phase/sdk';
 *
 * // Identify device (queued if SDK not ready)
 * await Phase.identify({ user_id: '123' });
 *
 * // Track events (queued if SDK not ready)
 * Phase.track('purchase', { amount: 99.99 });
 */
const Phase = {
  identify,
  track,
};

export { PhaseProvider, Phase };
export type { DeviceProperties, EventParams, PhaseConfig } from '../core/types';
