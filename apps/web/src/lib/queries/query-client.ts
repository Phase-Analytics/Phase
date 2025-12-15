import { QueryClient } from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        retryDelay: (attemptIndex) =>
          Math.min(1000 * 2 ** attemptIndex, 30_000),
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        staleTime: 30_000,
        gcTime: 20 * 60_000,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
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
