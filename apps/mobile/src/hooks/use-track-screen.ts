import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

import { track } from "@/lib/analytics";

export function useTrackScreen(
  name: string,
  params?: Record<string, string | number | boolean | null>
) {
  const paramsKey = JSON.stringify(params ?? {});

  useFocusEffect(
    useCallback(() => {
      void track(name, JSON.parse(paramsKey) as Record<
        string,
        string | number | boolean | null
      >);
    }, [name, paramsKey])
  );
}
