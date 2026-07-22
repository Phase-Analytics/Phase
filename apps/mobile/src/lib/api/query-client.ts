import { addEventListener } from "@react-native-community/netinfo";
import { onlineManager, QueryClient } from "@tanstack/react-query";

onlineManager.setEventListener((setOnline) =>
  addEventListener((state) => {
    setOnline(Boolean(state.isConnected));
  })
);

export const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      retry: false,
    },
    queries: {
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
      staleTime: 30_000,
      gcTime: 20 * 60_000,
      refetchOnReconnect: true,
    },
  },
});

export function getQueryClient() {
  return queryClient;
}

export const cacheConfig = {
  realtime: {
    staleTime: 0,
    gcTime: 5 * 60_000,
    refetchInterval: 15_000,
  },
  overview: {
    staleTime: 30_000,
    gcTime: 20 * 60_000,
  },
  list: {
    staleTime: 30_000,
    gcTime: 20 * 60_000,
  },
  detail: {
    staleTime: 30_000,
    gcTime: 20 * 60_000,
  },
  static: {
    staleTime: 30_000,
    gcTime: 40 * 60_000,
  },
  timeseries: {
    staleTime: 30_000,
    gcTime: 30 * 60_000,
  },
} as const;
