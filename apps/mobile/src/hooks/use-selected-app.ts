import { useCallback, useEffect } from "react";

import { usePref } from "@/hooks/use-pref";
import { useApps } from "@/lib/api/queries/apps";

const SELECTED_APP_KEY = "selected-app-id";

function parseString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function useSelectedApp() {
  const { data, isLoading: appsLoading, error } = useApps();
  const apps = data?.apps ?? [];
  const [selectedAppId, setSelectedAppIdPref] = usePref<string | null>(
    SELECTED_APP_KEY,
    null,
    (value) => parseString(value) ?? undefined
  );

  useEffect(() => {
    if (apps.length === 0) {
      return;
    }

    const stillValid =
      selectedAppId !== null && apps.some((app) => app.id === selectedAppId);

    if (!stillValid) {
      const nextId = apps[0]?.id;
      if (nextId) {
        setSelectedAppIdPref(nextId);
      }
    }
  }, [apps, selectedAppId, setSelectedAppIdPref]);

  const setSelectedAppId = useCallback(
    (appId: string) => {
      setSelectedAppIdPref(appId);
    },
    [setSelectedAppIdPref]
  );

  const selectedApp =
    apps.find((app) => app.id === selectedAppId) ?? apps[0] ?? null;

  return {
    apps,
    selectedApp,
    selectedAppId: selectedApp?.id ?? null,
    setSelectedAppId,
    isLoading: appsLoading,
    error,
  };
}
