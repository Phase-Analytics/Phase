import type { DateRangeParams, PaginationParams } from '@/lib/api/types';

export const queryKeys = {
  apps: {
    all: ['apps'] as const,
    lists: () => [...queryKeys.apps.all, 'list'] as const,
    list: () => [...queryKeys.apps.lists()] as const,
    details: () => [...queryKeys.apps.all, 'detail'] as const,
    detail: (appId: string) => [...queryKeys.apps.details(), appId] as const,
    keys: (appId: string) => [...queryKeys.apps.all, 'keys', appId] as const,
    team: (appId: string) => [...queryKeys.apps.all, 'team', appId] as const,
  },

  devices: {
    all: ['devices'] as const,
    lists: () => [...queryKeys.devices.all, 'list'] as const,
    list: (
      appId: string,
      filters?: PaginationParams & DateRangeParams & { platform?: string }
    ) => [...queryKeys.devices.lists(), appId, filters] as const,
    details: () => [...queryKeys.devices.all, 'detail'] as const,
    detail: (deviceId: string, appId: string) =>
      [...queryKeys.devices.details(), deviceId, appId] as const,
    overview: (appId: string) =>
      [...queryKeys.devices.all, 'overview', appId] as const,
    live: (appId: string) => [...queryKeys.devices.all, 'live', appId] as const,
    timeseries: (appId: string, params?: Record<string, unknown>) =>
      [...queryKeys.devices.all, 'timeseries', appId, params] as const,
  },

  sessions: {
    all: ['sessions'] as const,
    lists: () => [...queryKeys.sessions.all, 'list'] as const,
    list: (
      appId: string,
      deviceId: string,
      filters?: PaginationParams & DateRangeParams
    ) => [...queryKeys.sessions.lists(), appId, deviceId, filters] as const,
    overview: (appId: string) =>
      [...queryKeys.sessions.all, 'overview', appId] as const,
    timeseries: (appId: string, params?: Record<string, unknown>) =>
      [...queryKeys.sessions.all, 'timeseries', appId, params] as const,
  },

  events: {
    all: ['events'] as const,
    lists: () => [...queryKeys.events.all, 'list'] as const,
    list: (
      appId: string,
      filters?: PaginationParams &
        DateRangeParams & {
          sessionId?: string;
          deviceId?: string;
          eventName?: string;
        }
    ) => [...queryKeys.events.lists(), appId, filters] as const,
    details: () => [...queryKeys.events.all, 'detail'] as const,
    detail: (eventId: string, appId: string) =>
      [...queryKeys.events.details(), eventId, appId] as const,
    overview: (appId: string) =>
      [...queryKeys.events.all, 'overview', appId] as const,
    top: (appId: string, filters?: DateRangeParams) =>
      [...queryKeys.events.all, 'top', appId, filters] as const,
    timeseries: (appId: string, timeRange: string) =>
      [...queryKeys.events.all, 'timeseries', appId, timeRange] as const,
  },
} as const;
