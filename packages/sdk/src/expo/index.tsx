import { usePathname, useSegments } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PhaseSDK } from '../core/sdk';
import type { EventParams, PhaseConfig } from '../core/types';
import { logger } from '../core/utils/logger';
import { getExpoDeviceInfo } from './device/expo-device-info';

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

    await ensureSDK().init(config, getExpoDeviceInfo);
    return true;
  } catch (error) {
    logger.error('Initialization failed', error);
    return false;
  }
}

type PhaseProps = PhaseConfig & {
  children: ReactNode;
};

/**
 * Phase Analytics Provider for Expo Router
 *
 * Wrap your root layout with this component to enable analytics.
 * Automatically initializes the SDK and tracks screen navigation.
 *
 * @param apiKey - Your Phase API key (required, starts with "phase_")
 * @param children - Your app content
 * @param trackNavigation - Auto-track screen navigation (optional, default: true)
 * @param deviceInfo - Collect device metadata (optional, default: true)
 * @param userLocale - Collect user locale + geolocation (optional, default: true)
 * @param baseUrl - Custom API endpoint for self-hosting (optional)
 * @param logLevel - Logging: 'debug' | 'info' | 'error' | 'none' (optional, default: 'none')
 *
 * @example
 * ```tsx
 * // app/_layout.tsx
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
 * // With options
 * <Phase
 *   apiKey="phase_xxx"
 *   logLevel="debug"
 *   trackNavigation={true}
 *   deviceInfo={true}
 *   userLocale={false}
 * >
 *   <Stack />
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

  const pathname = usePathname();
  const segments = useSegments();
  const segmentsKey = useMemo(() => segments.join('/'), [segments]);

  useEffect(() => {
    if (!(initialized && trackNavigation)) {
      return;
    }

    const instance = getSDK();
    if (!instance) {
      return;
    }

    const screenName = pathname || segmentsKey || 'unknown';
    instance.trackScreen(screenName);
  }, [initialized, pathname, segmentsKey, trackNavigation]);

  return children;
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
