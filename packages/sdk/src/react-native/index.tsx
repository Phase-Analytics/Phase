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
    return true;
  } catch (error) {
    logger.error('Initialization failed', error);
    return false;
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
  initialized,
  currentRouteName,
}: {
  initialized: boolean;
  currentRouteName: string | undefined;
}): ReactNode {
  const prevRouteRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!(initialized && currentRouteName)) {
      return;
    }

    if (prevRouteRef.current === currentRouteName) {
      return;
    }

    prevRouteRef.current = currentRouteName;
    const instance = getSDK();
    instance?.trackScreen(formatScreenName(currentRouteName));
  }, [initialized, currentRouteName]);

  return null;
}

/**
 * Phase Analytics provider for React Native
 * @param apiKey Phase API key (required, starts with `phase_`)
 * @param children App content (required)
 * @param trackNavigation Auto-track screens (optional, default: false)
 * @param baseUrl Custom API endpoint (optional, default: "https://api.phase.sh")
 * @param logLevel Logging level (optional, default: "none")
 * @param deviceInfo Collect device metadata (optional, default: true)
 * @param userLocale Collect locale & geolocation (optional, default: true)
 * @example
 * <Phase apiKey="phase_xxx" trackNavigation>
 *   <Stack.Navigator>
 *     <Stack.Screen name="Home" component={HomeScreen} />
 *   </Stack.Navigator>
 * </Phase>
 */
function Phase({
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
  const navigationRef = useNavigationContainerRef();
  const [initialized, setInitialized] = useState(false);
  const [currentRouteName, setCurrentRouteName] = useState<string | undefined>(
    undefined
  );
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

  if (!trackNavigation) {
    return children;
  }

  const handleReady = () => {
    const currentRoute = navigationRef.getCurrentRoute();
    setCurrentRouteName(currentRoute?.name);
    onReady?.();
  };

  const handleStateChange: NavigationContainerProps['onStateChange'] = (
    state
  ) => {
    const currentRoute = navigationRef.getCurrentRoute();
    setCurrentRouteName(currentRoute?.name);
    onStateChange?.(state);
  };

  return (
    <NavigationContainer
      onReady={handleReady}
      onStateChange={handleStateChange}
      ref={navigationRef}
      {...navigationProps}
    >
      <NavigationTracker
        currentRouteName={currentRouteName}
        initialized={initialized}
      />
      {children}
    </NavigationContainer>
  );
}

/**
 * Register device and start session
 * @param properties Custom device attributes (optional)
 * @example
 * // Basic usage
 * await identify();
 *
 * // After user login
 * await identify({ user_id: '123', plan: 'premium' });
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
 * track('purchase', { amount: 99.99, currency: 'USD' });
 */
function track(name: string, params?: EventParams): void {
  const instance = getSDK();
  if (!instance) {
    logger.error('SDK not initialized. Wrap your app with <Phase>.');
    return;
  }
  instance.track(name, params);
}

export { Phase, identify, track };
export type { DeviceProperties, EventParams, PhaseConfig } from '../core/types';
