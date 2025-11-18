import type { DateRangeParams, PaginationParams } from '@/lib/api/types';

export const queryKeys = {
  devices: {
    all: ['devices'] as const,
    lists: () => [...queryKeys.devices.all, 'list'] as const,
    list: (
      appId: string,
      filters?: PaginationParams & DateRangeParams & { platform?: string }
    ) => [...queryKeys.devices.lists(), appId, filters] as const,
    details: () => [...queryKeys.devices.all, 'detail'] as const,
    detail: (appId: string, deviceId: string) =>
      [...queryKeys.devices.details(), appId, deviceId] as const,
    overview: (appId: string) =>
      [...queryKeys.devices.all, 'overview', appId] as const,
    live: (appId: string) => [...queryKeys.devices.all, 'live', appId] as const,
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
    detail: (appId: string, eventId: string) =>
      [...queryKeys.events.details(), appId, eventId] as const,
    overview: (appId: string) =>
      [...queryKeys.events.all, 'overview', appId] as const,
    top: (appId: string, filters?: DateRangeParams) =>
      [...queryKeys.events.all, 'top', appId, filters] as const,
  },
} as const;
