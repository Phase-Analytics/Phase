import type { ParamListBase } from '@react-navigation/native';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { PhaseSDK } from '../core/sdk';
import { setStorageAdapter } from '../core/storage/storage';
import type { DeviceProperties, EventParams, PhaseConfig } from '../core/types';
import { logger } from '../core/utils/logger';
import { getRNDeviceInfo } from './device/rn-device-info';
import { addNetworkListener, fetchNetworkState } from './network/rn-network';
import { clear, getItem, removeItem, setItem } from './storage/rn-storage';

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

type NavigationContainerProps = React.ComponentProps<
  typeof NavigationContainer
>;

type PhaseProps = PhaseConfig &
  Omit<NavigationContainerProps, 'ref'> & {
    children: ReactNode;
  };

function formatScreenName(name: string): string {
  const kebabCase = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  return `/${kebabCase}`;
}

function NavigationTracker({
  navigationRef,
}: {
  navigationRef: ReturnType<typeof useNavigationContainerRef<ParamListBase>>;
}): ReactNode {
  const currentRouteNameRef = useRef<string | undefined>(undefined);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    onSDKReady(() => {
      setIsReady(true);
      try {
        const currentRoute = navigationRef.getCurrentRoute();
        if (currentRoute?.name) {
          currentRouteNameRef.current = currentRoute.name;
          const instance = getSDK();
          instance?.trackScreen(formatScreenName(currentRoute.name));
        }
      } catch {
        // Navigation not ready yet
      }
    });
  }, [navigationRef]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const listener = () => {
      try {
        const currentRoute = navigationRef.getCurrentRoute();
        const routeName = currentRoute?.name;

        if (routeName && currentRouteNameRef.current !== routeName) {
          currentRouteNameRef.current = routeName;
          const instance = getSDK();
          instance?.trackScreen(formatScreenName(routeName));
        }
      } catch {
        // Navigation not ready yet
      }
    };

    const unsubscribe = navigationRef.addListener('state' as never, listener);

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [isReady, navigationRef]);

  return null;
}

/**
 * Phase Analytics provider for React Native
 * @param apiKey Phase API key (required, starts with `phase_`)
 * @param children App content (required)
 * @param trackNavigation Auto-track screens (optional, default: false)
 * @param baseUrl Custom API endpoint (optional, default: "https://api.phase.sh")
 * @param logLevel Logging level (optional, info, warn, error, none, default: "none")
 * @param deviceInfo Collect device metadata (optional, default: true)
 * @param userLocale Collect locale & geolocation (optional, default: true)
 * @example
 * <PhaseProvider apiKey="phase_xxx" trackNavigation>
 *   <Stack.Navigator>
 *     <Stack.Screen name="Home" component={HomeScreen} />
 *   </Stack.Navigator>
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
  onReady,
  onStateChange,
  ...navigationProps
}: PhaseProps): ReactNode {
  const navigationRef = useNavigationContainerRef<ParamListBase>();
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

  if (!trackNavigation) {
    return children;
  }

  return (
    <NavigationContainer
      onReady={onReady}
      onStateChange={onStateChange}
      ref={navigationRef as never}
      {...navigationProps}
    >
      <NavigationTracker navigationRef={navigationRef} />
      {children}
    </NavigationContainer>
  );
}

/**
 * Register device and start session
 * @param properties Custom device attributes (optional)
 * @example
 * // Basic usage
 * await Phase.identify();
 *
 * // After user login
 * await Phase.identify({ user_id: '123', plan: 'premium' });
 */
async function identify(properties?: DeviceProperties): Promise<void> {
  if (initializationPromise) {
    await initializationPromise;
  }

  const instance = getSDK();
  if (!instance) {
    logger.error('SDK not initialized. Wrap your app with <PhaseProvider>.');
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
async function track(name: string, params?: EventParams): Promise<void> {
  if (initializationPromise) {
    await initializationPromise;
  }

  const instance = getSDK();
  if (!instance) {
    logger.error('SDK not initialized. Wrap your app with <PhaseProvider>.');
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
