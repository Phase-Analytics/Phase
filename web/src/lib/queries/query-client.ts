import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const cacheConfig = {
  realtime: {
    staleTime: 0,
    gcTime: 60_000,
    refetchInterval: 30_000,
  },
  overview: {
    staleTime: 60_000,
    gcTime: 600_000,
  },
  list: {
    staleTime: 30_000,
    gcTime: 300_000,
  },
  detail: {
    staleTime: 120_000,
    gcTime: 600_000,
  },
  static: {
    staleTime: 600_000,
    gcTime: 3_600_000,
  },
} as const;
