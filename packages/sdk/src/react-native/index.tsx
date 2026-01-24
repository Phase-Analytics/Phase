import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
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
import { getRNDeviceInfo } from './device/rn-device-info';

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
        require('react-native-device-info');
      } catch {
        missingPackages.push('react-native-device-info');
      }

      try {
        require('react-native-localize');
      } catch {
        missingPackages.push('react-native-localize');
      }

      try {
        require('@react-native-async-storage/async-storage');
      } catch {
        missingPackages.push('@react-native-async-storage/async-storage');
      }

      if (missingPackages.length > 0) {
        logger.info(
          `Optional React Native packages not found: ${missingPackages.join(', ')}\n` +
            'For better device info and storage, install them:\n' +
            `  npm install ${missingPackages.join(' ')}`
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

      await ensureSDK().init(config, getRNDeviceInfo, networkAdapter);

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

type NavigationState = {
  routes?: Array<{
    name?: string;
    key?: string;
    state?: NavigationState;
  }>;
  index?: number;
};

type NavigationRefType = {
  addListener?: (
    event: string,
    callback: (e: { data?: { state?: NavigationState } }) => void
  ) => () => void;
  getCurrentRoute?: () => { name?: string } | undefined;
  getRootState?: () => NavigationState | undefined;
};

type PhaseProps = PhaseConfig & {
  children: ReactNode;
  navigationRef?: NavigationRefType;
};

const CAMEL_CASE_REGEX = /([A-Z])/g;
const LEADING_DASH_REGEX = /^-/;

function buildPathFromState(state: NavigationState | undefined): string {
  if (!state) {
    return '/';
  }

  const segments: string[] = [];

  function traverse(navState: NavigationState): void {
    const { routes, index } = navState;
    if (!routes || typeof index !== 'number' || !routes[index]) {
      return;
    }

    const route = routes[index];
    if (route.name) {
      const segment = route.name
        .replace(CAMEL_CASE_REGEX, '-$1')
        .toLowerCase()
        .replace(LEADING_DASH_REGEX, '');
      segments.push(segment);
    }

    if (route.state) {
      traverse(route.state);
    }
  }

  traverse(state);

  return segments.length > 0 ? `/${segments.join('/')}` : '/';
}

function NavigationTracker({
  navigationRef,
}: {
  navigationRef?: NavigationRefType;
}): ReactNode {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    onSDKReady(() => {
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (!(isReady && navigationRef)) {
      return;
    }

    try {
      if (navigationRef.getRootState) {
        const state = navigationRef.getRootState();
        const path = buildPathFromState(state);
        const instance = getSDK();
        if (instance) {
          instance.trackScreen(path);
        }
      }
    } catch (error) {
      logger.error('Failed to get initial route', error);
    }

    if (!navigationRef.addListener) {
      return;
    }

    try {
      const unsubscribe = navigationRef.addListener('state', (e) => {
        const state = e?.data?.state;
        const path = buildPathFromState(state);

        const instance = getSDK();
        if (instance) {
          instance.trackScreen(path);
        }
      });

      return unsubscribe;
    } catch (error) {
      logger.error('Failed to set up navigation listener', error);
      return;
    }
  }, [isReady, navigationRef]);

  return null;
}

/**
 * Phase Analytics provider for React Native
 * @param apiKey Phase API key (required, starts with `phase_`)
 * @param children App content (required)
 * @param trackNavigation Auto-track screens (optional, default: false)
 * @param navigationRef Navigation container ref for auto-tracking (optional, required if trackNavigation is true)
 * @param baseUrl Custom API endpoint (optional, default: "https://api.phase.sh")
 * @param logLevel Logging level (optional, info, warn, error, none, default: "none")
 * @param deviceInfo Collect device metadata (optional, default: true)
 * @param userLocale Collect locale & geolocation (optional, default: true)
 * @example
 * const navigationRef = useNavigationContainerRef();
 *
 * <NavigationContainer ref={navigationRef}>
 *   <PhaseProvider apiKey="phase_xxx" trackNavigation={true} navigationRef={navigationRef}>
 *     <YourApp />
 *   </PhaseProvider>
 * </NavigationContainer>
 */
function PhaseProvider({
  children,
  apiKey,
  baseUrl,
  logLevel,
  trackNavigation = false,
  navigationRef,
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
      {trackNavigation && <NavigationTracker navigationRef={navigationRef} />}
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
 * import { Phase } from 'phase-analytics/react-native';
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
