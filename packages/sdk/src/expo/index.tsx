import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PhaseSDK } from '../core/sdk';
import { setStorageAdapter } from '../core/storage/storage';
import type { EventParams, PhaseConfig } from '../core/types';
import { logger } from '../core/utils/logger';
import { getExpoDeviceInfo } from './device/expo-device-info';
import { addNetworkListener, fetchNetworkState } from './network/expo-network';
import { clear, getItem, removeItem, setItem } from './storage/expo-storage';

let usePathname: typeof import('expo-router').usePathname | null = null;
let useSegments: typeof import('expo-router').useSegments | null = null;
let expoRouterAvailable = false;

const safeRequire = (id: string) => require(id);

try {
  const expoRouter = safeRequire('expo-router');
  usePathname = expoRouter.usePathname;
  useSegments = expoRouter.useSegments;
  expoRouterAvailable = true;
} catch {
  expoRouterAvailable = false;
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

// Inner component that uses expo-router hooks - only rendered when expo-router is available
function NavigationTracker({
  initialized,
}: {
  initialized: boolean;
}): ReactNode {
  // These are guaranteed to exist when this component is rendered
  // (parent only renders this when expoRouterAvailable is true)
  const usePathnameHook = usePathname as NonNullable<typeof usePathname>;
  const useSegmentsHook = useSegments as NonNullable<typeof useSegments>;

  const pathname = usePathnameHook();
  const segments = useSegmentsHook();
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
 * Phase Analytics Provider for Expo Router
 *
 * Wrap your root layout with this component to enable analytics.
 * If expo-router is installed, automatically tracks screen navigation.
 * If not installed, it works as a simple provider for manual event tracking only.
 *
 * @param apiKey - Your Phase API key (required, starts with "phase_")
 * @param children - Your app content
 * @param trackNavigation - Auto-track screen navigation (optional, default: true if expo-router is installed)
 * @param deviceInfo - Collect device metadata (optional, default: true)
 * @param userLocale - Collect user locale + geolocation (optional, default: true)
 * @param baseUrl - Custom API endpoint for self-hosting (optional)
 * @param logLevel - Logging: 'debug' | 'info' | 'error' | 'none' (optional, default: 'none')
 *
 * @example
 * ```tsx
 * // app/_layout.tsx - With navigation tracking (requires expo-router)
 * import { Phase } from 'phase-analytics/expo';
 *
 * export default function RootLayout() {
 *   return (
 *     <Phase apiKey="phase_xxx">
 *       <Stack />
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
}: PhaseProps): ReactNode {
  const shouldTrackNavigation = trackNavigation ?? expoRouterAvailable;

  useEffect(() => {
    if (trackNavigation === true && !expoRouterAvailable) {
      logger.error(
        'trackNavigation is enabled but expo-router is not installed.\n' +
          'Install it with: npx expo install expo-router\n' +
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

  return (
    <>
      {shouldTrackNavigation && expoRouterAvailable && (
        <NavigationTracker initialized={initialized} />
      )}
      {children}
    </>
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
 * import { track } from 'phase-analytics/expo';
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
