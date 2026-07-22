import type { DeviceProperties, EventParams } from "phase-analytics/expo";
import { Phase, PhaseProvider } from "phase-analytics/expo";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";

const apiKey = process.env.EXPO_PUBLIC_PHASE_API_KEY?.trim();
const isEnabled = apiKey !== undefined && apiKey.length > 0;
const baseUrl = (
  process.env.EXPO_PUBLIC_SERVER_URL || "https://api.phase.sh"
).replace(/\/$/, "");

if (__DEV__ && !isEnabled) {
  console.warn(
    "[Phase] EXPO_PUBLIC_PHASE_API_KEY is not set — dogfood analytics disabled"
  );
}

export function track(name: string, params?: EventParams): Promise<void> {
  if (!isEnabled) {
    return Promise.resolve();
  }

  return Phase.track(name, params);
}

export function identify(properties?: DeviceProperties): Promise<void> {
  if (!isEnabled) {
    return Promise.resolve();
  }

  return Phase.identify(properties);
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  if (!(isEnabled && apiKey !== undefined)) {
    return children;
  }

  return (
    <PhaseProvider
      apiKey={apiKey}
      baseUrl={baseUrl}
      logLevel={__DEV__ ? "info" : "warn"}
      trackNavigation={false}
    >
      <BootstrapAnalytics />
      {children}
    </PhaseProvider>
  );
}

function BootstrapAnalytics() {
  useEffect(() => {
    void (async () => {
      await identify({
        app_name: "Phase Mobile",
        app_version: Constants.expoConfig?.version ?? "0.0.1",
        platform: Platform.OS,
      });
      await track("mobile_app_open", {
        platform: Platform.OS,
        version: Constants.expoConfig?.version ?? "0.0.1",
      });
    })();
  }, []);

  return null;
}
