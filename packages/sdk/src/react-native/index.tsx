import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { PhaseSDK } from '../core/sdk';
import { setStorageAdapter } from '../core/storage/storage';
import type { EventParams, PhaseConfig } from '../core/types';
import { logger } from '../core/utils/logger';
import { getRNDeviceInfo } from './device/rn-device-info';
import { addNetworkListener, fetchNetworkState } from './network/rn-network';
import { clear, getItem, removeItem, setItem } from './storage/rn-storage';

let NavigationContainer:
  | typeof import('@react-navigation/native').NavigationContainer
  | null = null;
let useNavigationContainerRef:
  | typeof import('@react-navigation/native').useNavigationContainerRef
  | null = null;
let reactNavigationAvailable = false;

const safeRequire = (id: string) => require(id);

try {
  const reactNavigation = safeRequire('@react-navigation/native');
  NavigationContainer = reactNavigation.NavigationContainer;
  useNavigationContainerRef = reactNavigation.useNavigationContainerRef;
  reactNavigationAvailable = true;
} catch {
  reactNavigationAvailable = false;
}

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

type NavigationContainerType =
  typeof import('@react-navigation/native').NavigationContainer;
type NavigationContainerProps = React.ComponentProps<NavigationContainerType>;

type PhaseProps = PhaseConfig &
  Omit<NavigationContainerProps, 'ref'> & {
    children: ReactNode;
  };

function PhaseWithNavigation({
  children,
  initialized,
  onReady,
  onStateChange,
  ...navigationProps
}: {
  children: ReactNode;
  initialized: boolean;
  onReady?: () => void;
  onStateChange?: NavigationContainerProps['onStateChange'];
} & Omit<NavigationContainerProps, 'ref' | 'onReady' | 'onStateChange'>) {
  const useNavRef = useNavigationContainerRef as NonNullable<
    typeof useNavigationContainerRef
  >;
  const NavContainer = NavigationContainer as NonNullable<
    typeof NavigationContainer
  >;

  const navigationRef = useNavRef();
  const routeNameRef = useRef<string | undefined>(undefined);

  const handleReady = () => {
    if (initialized) {
      const currentRoute = navigationRef.getCurrentRoute();
      routeNameRef.current = currentRoute?.name;

      if (currentRoute?.name) {
        const instance = getSDK();
        instance?.trackScreen(currentRoute.name);
      }
    }

    onReady?.();
  };

  const handleStateChange: NavigationContainerProps['onStateChange'] = (
    state
  ) => {
    if (initialized) {
      const currentRoute = navigationRef.getCurrentRoute();
      const previousRouteName = routeNameRef.current;
      const currentRouteName = currentRoute?.name;

      if (currentRouteName && previousRouteName !== currentRouteName) {
        const instance = getSDK();
        instance?.trackScreen(currentRouteName);
      }

      routeNameRef.current = currentRouteName;
    }

    onStateChange?.(state);
  };

  return (
    <NavContainer
      onReady={handleReady}
      onStateChange={handleStateChange}
      ref={navigationRef}
      {...navigationProps}
    >
      {children}
    </NavContainer>
  );
}

/**
 * Phase Analytics Provider for React Native
 *
 * Wrap your app with this component to enable analytics.
 * If @react-navigation/native is installed, it replaces NavigationContainer and auto-tracks navigation.
 * If not installed, it works as a simple provider for manual event tracking only.
 *
 * @param apiKey - Your Phase API key (required, starts with "phase_")
 * @param children - Your navigation stack
 * @param trackNavigation - Auto-track screen navigation (optional, default: true if @react-navigation/native is installed)
 * @param deviceInfo - Collect device metadata (default: true)
 * @param userLocale - Collect user locale + geolocation (optional, default: true)
 * @param baseUrl - Custom API endpoint for self-hosting (optional)
 * @param logLevel - Logging: 'debug' | 'info' | 'error' | 'none' (optional, default: 'none')
 *
 * All NavigationContainer props are also supported when @react-navigation/native is installed.
 *
 * @example
 * ```tsx
 * // App.tsx - With navigation tracking (requires @react-navigation/native)
 * import { Phase } from 'phase-analytics/react-native';
 *
 * export default function App() {
 *   return (
 *     <Phase apiKey="phase_xxx">
 *       <Stack.Navigator>
 *         <Stack.Screen name="Home" component={HomeScreen} />
 *       </Stack.Navigator>
 *     </Phase>
 *   );
 * }
 *
 * // Without navigation tracking (no extra dependencies)
 * <Phase apiKey="phase_xxx" trackNavigation={false}>
 *   <YourApp />
 * </Phase>
 * ```
 */
function Phase({
  children,
  apiKey,
  baseUrl,
  logLevel,
  trackNavigation,
  deviceInfo,
  userLocale,
  onReady,
  onStateChange,
  ...navigationProps
}: PhaseProps): ReactNode {
  const shouldTrackNavigation = trackNavigation ?? reactNavigationAvailable;

  useEffect(() => {
    if (trackNavigation === true && !reactNavigationAvailable) {
      logger.error(
        'trackNavigation is enabled but @react-navigation/native is not installed.\n' +
          'Install it with: npm install @react-navigation/native react-native-screens react-native-safe-area-context\n' +
          'Or disable navigation tracking: <Phase trackNavigation={false}>'
      );
    }
  }, [trackNavigation]);

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
      trackNavigation: shouldTrackNavigation,
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
  }, [
    apiKey,
    baseUrl,
    deviceInfo,
    logLevel,
    shouldTrackNavigation,
    userLocale,
  ]);

  if (!(shouldTrackNavigation && reactNavigationAvailable)) {
    return children;
  }

  return (
    <PhaseWithNavigation
      initialized={initialized}
      onReady={onReady}
      onStateChange={onStateChange}
      {...navigationProps}
    >
      {children}
    </PhaseWithNavigation>
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
