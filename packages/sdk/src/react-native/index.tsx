import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { PhaseSDK } from '../core/sdk';
import { setStorageAdapter } from '../core/storage/storage';
import type { EventParams, PhaseConfig } from '../core/types';
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
 * Phase Analytics Provider for React Native
 *
 * Wrap your app with this component to enable analytics.
 * Set trackNavigation={true} to enable automatic screen tracking (requires @react-navigation/native).
 *
 * @param apiKey - Your Phase API key (required, starts with "phase_")
 * @param children - Your app content or navigation stack
 * @param trackNavigation - Auto-track screen navigation (default: false, requires @react-navigation/native)
 * @param deviceInfo - Collect device metadata (default: true)
 * @param userLocale - Collect user locale + geolocation (optional, default: true)
 * @param baseUrl - Custom API endpoint for self-hosting (optional)
 * @param logLevel - Logging: 'debug' | 'info' | 'error' | 'none' (optional, default: 'none')
 *
 * When trackNavigation={true}, all NavigationContainer props are also supported.
 *
 * @example
 * ```tsx
 * // Basic usage - event tracking only
 * <Phase apiKey="phase_xxx">
 *   <YourApp />
 * </Phase>
 *
 * // With navigation tracking (requires @react-navigation/native)
 * <Phase apiKey="phase_xxx" trackNavigation={true}>
 *   <Stack.Navigator>
 *     <Stack.Screen name="Home" component={HomeScreen} />
 *   </Stack.Navigator>
 * </Phase>
 * ```
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
 * Track a custom event
 *
 * @param name - Event name (required, 1-256 chars, alphanumeric + . / - _)
 * @param params - Event parameters (optional, max depth 6, max size 50KB)
 *
 * @example
 * ```tsx
 * import { track } from 'phase-analytics/react-native';
 *
 * track('button_click', { button_id: 'submit' });
 * ```
 */
function track(name: string, params?: EventParams): void {
  const instance = getSDK();
  if (!instance) {
    logger.error('SDK not initialized. Wrap your app with <Phase>.');
    return;
  }
  instance.track(name, params);
}

export { Phase, track };
export type { EventParams, PhaseConfig } from '../core/types';
