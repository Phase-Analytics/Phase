import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { PhaseSDK } from '../core/sdk';
import type { EventParams, PhaseConfig } from '../core/types';
import { logger } from '../core/utils/logger';
import { getRNDeviceInfo } from './device/rn-device-info';

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
    await ensureSDK().init(config, getRNDeviceInfo);
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

/**
 * Phase Analytics Provider for React Native
 *
 * Replaces NavigationContainer - wrap your navigators with this component.
 * Automatically initializes the SDK and tracks screen navigation.
 *
 * @param apiKey - Your Phase API key (required, starts with "phase_")
 * @param children - Your navigation stack
 * @param trackNavigation - Auto-track screen navigation (optional, default: true)
 * @param deviceInfo - Collect device metadata (default: true)
 * @param userLocale - Collect user locale + geolocation (optional, default: true)
 * @param baseUrl - Custom API endpoint for self-hosting (optional)
 * @param logLevel - Logging: 'debug' | 'info' | 'error' | 'none' (optional, default: 'none')
 *
 * All NavigationContainer props are also supported (theme, linking, etc.)
 *
 * @example
 * ```tsx
 * // App.tsx
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
 * // With NavigationContainer options
 * <Phase
 *   apiKey="phase_xxx"
 *   theme={MyTheme}
 *   linking={linkingConfig}
 *   logLevel="debug"
 * >
 *   <Stack.Navigator>...</Stack.Navigator>
 * </Phase>
 * ```
 */
function Phase({
  children,
  apiKey,
  baseUrl,
  logLevel,
  trackNavigation = true,
  deviceInfo,
  userLocale,
  onReady,
  onStateChange,
  ...navigationProps
}: PhaseProps): ReactNode {
  const navigationRef = useNavigationContainerRef();
  const [initialized, setInitialized] = useState(false);
  const initStarted = useRef(false);
  const routeNameRef = useRef<string | undefined>(undefined);

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

  const handleReady = () => {
    if (trackNavigation && initialized) {
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
    if (trackNavigation && initialized) {
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
    <NavigationContainer
      onReady={handleReady}
      onStateChange={handleStateChange}
      ref={navigationRef}
      {...navigationProps}
    >
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
