import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { createPhase } from '../core/phase';
import type { PhaseConfig } from '../core/types';
import { logger } from '../core/utils/logger';
import { getMissingRNPackages, getRNDeviceInfo } from './device/rn-device-info';

const { init, Phase } = createPhase({
  getDeviceInfo: getRNDeviceInfo,
  missingPackages: getMissingRNPackages,
  installCommand: 'npm install',
});

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
  useEffect(() => {
    if (!navigationRef) {
      logger.error('trackNavigation requires a navigationRef.');
      return;
    }

    // State events also fire for param and nested updates; track focus changes only.
    let lastPath: string | null = null;
    const trackState = (state: NavigationState | undefined) => {
      // Undefined until the NavigationContainer is ready.
      if (!state) {
        return;
      }
      const path = buildPathFromState(state);
      if (path !== lastPath) {
        lastPath = path;
        Phase.trackScreen(path);
      }
    };

    try {
      trackState(navigationRef.getRootState?.());
    } catch (error) {
      logger.error('Failed to get initial route', error);
    }

    if (!navigationRef.addListener) {
      return;
    }

    try {
      return navigationRef.addListener('state', (e) => {
        trackState(e?.data?.state);
      });
    } catch (error) {
      logger.error('Failed to set up navigation listener', error);
      return;
    }
  }, [navigationRef]);

  return null;
}

/**
 * Phase Analytics provider for React Native
 * @param apiKey Phase API key (required, starts with `phase_`)
 * @param children App content (required)
 * @param trackNavigation Auto-track screens (optional, default: false)
 * @param navigationRef Navigation container ref for auto-tracking (optional, required if trackNavigation is true)
 * @param debugData Mark identify/events as debug data (optional, default: false)
 * @param baseUrl Custom API endpoint (optional, default: "https://api.phase.sh")
 * @param logLevel Logging level (optional, info, warn, error, none, default: "none")
 * @param deviceInfo Collect device metadata (optional, default: true, includes app version as `app_version`)
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

  return (
    <>
      {trackNavigation && <NavigationTracker navigationRef={navigationRef} />}
      {children}
    </>
  );
}

export { PhaseProvider, Phase };
export type { DeviceProperties, EventParams, PhaseConfig } from '../core/types';
