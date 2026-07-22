import type { UseQueryResult } from "@tanstack/react-query";
import { Platform, RefreshControl } from "react-native";

import { useTheme } from "@/hooks/use-theme";

type Refetchable = Pick<UseQueryResult, "isRefetching" | "refetch">;

/** iOS needs bounce for RefreshControl; Android PTR uses SwipeRefreshLayout. */
export const refreshScrollProps = {
  alwaysBounceVertical: true,
  bounces: true,
  overScrollMode: "never" as const,
};

/** No rubber-band / glow when the screen has no pull-to-refresh. */
export const noOverscrollProps = {
  alwaysBounceVertical: false,
  bounces: false,
  overScrollMode: "never" as const,
};

export function useQueryRefresh(...queries: Refetchable[]) {
  const refreshing = queries.some((query) => query.isRefetching);

  function onRefresh() {
    void Promise.all(queries.map((query) => query.refetch()));
  }

  return { refreshing, onRefresh };
}

export function QueryRefreshControl({
  refreshing,
  onRefresh,
}: {
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const theme = useTheme();

  return (
    <RefreshControl
      colors={[theme.text]}
      onRefresh={onRefresh}
      progressBackgroundColor={theme.backgroundElement}
      refreshing={refreshing}
      tintColor={theme.text}
      {...(Platform.OS === "ios"
        ? { titleColor: theme.textSecondary }
        : {})}
    />
  );
}
