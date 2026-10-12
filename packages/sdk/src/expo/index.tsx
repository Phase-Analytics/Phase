import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { createPhase } from '../core/phase';
import type { PhaseConfig } from '../core/types';
import { logger } from '../core/utils/logger';
import {
  getExpoDeviceInfo,
  getMissingExpoPackages,
} from './device/expo-device-info';

type ExpoRouter = {
  usePathname: () => string;
  useSegments: () => string[];
};

let expoRouter: ExpoRouter | null = null;

try {
  expoRouter = require('expo-router');
} catch {
  // Optional peer: only needed for trackNavigation.
}

const { init, Phase } = createPhase({
  getDeviceInfo: getExpoDeviceInfo,
  missingPackages: getMissingExpoPackages,
  installCommand: 'npx expo install',
});

function NavigationTracker({ router }: { router: ExpoRouter }): null {
  const pathname = router.usePathname();
  const segmentsKey = router.useSegments().join('/');

  useEffect(() => {
    Phase.trackScreen(pathname || segmentsKey || 'unknown');
  }, [pathname, segmentsKey]);

  return null;
}

type PhaseProps = PhaseConfig & {
  children: ReactNode;
};

/**
 * Phase Analytics provider for Expo Router
 * @param apiKey Phase API key (required, starts with `phase_`)
 * @param children App content (required)
 * @param trackNavigation Auto-track screens (optional, default: false, requires `expo-router`)
 * @param debugData Mark identify/events as debug data (optional, default: false)
 * @param baseUrl Custom API endpoint (optional, default: "https://api.phase.sh")
 * @param logLevel Logging level (optional, info, warn, error, none, default: "none")
 * @param deviceInfo Collect device metadata (optional, default: true, includes app version as `app_version`)
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
  debugData,
  deviceInfo,
  userLocale,
}: PhaseProps): ReactNode {
  useEffect(() => {
    // Initializes once per process; a failed init can be retried with new props.
    init({
      apiKey,
      baseUrl,
      logLevel,
      trackNavigation,
      debugData,
      deviceInfo,
      userLocale,
    });
  }, [
    apiKey,
    baseUrl,
    debugData,
    deviceInfo,
    logLevel,
    trackNavigation,
    userLocale,
  ]);

  useEffect(() => {
    if (trackNavigation && !expoRouter) {
      logger.error('trackNavigation requires expo-router to be installed.');
    }
  }, [trackNavigation]);

  return (
    <>
      {trackNavigation && expoRouter && (
        <NavigationTracker router={expoRouter} />
      )}
      {children}
    </>
  );
}

export type { DeviceProperties, EventParams, PhaseConfig } from '../core/types';
export { Phase, PhaseProvider };
