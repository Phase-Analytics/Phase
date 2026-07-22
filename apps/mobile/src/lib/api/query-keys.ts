import type { DateFilterQueryParams, PaginationQueryParams } from "@phase/shared";

export const queryKeys = {
  apps: {
    all: ["apps"] as const,
    lists: () => [...queryKeys.apps.all, "list"] as const,
    list: () => [...queryKeys.apps.lists()] as const,
    details: () => [...queryKeys.apps.all, "detail"] as const,
    detail: (appId: string) => [...queryKeys.apps.details(), appId] as const,
  },
  devices: {
    all: ["devices"] as const,
    lists: () => [...queryKeys.devices.all, "list"] as const,
    list: (
      appId: string,
      filters?: PaginationQueryParams & DateFilterQueryParams & { platform?: string }
    ) => [...queryKeys.devices.lists(), appId, filters] as const,
    details: () => [...queryKeys.devices.all, "detail"] as const,
    detail: (deviceId: string, appId: string) =>
      [...queryKeys.devices.details(), deviceId, appId] as const,
    overview: (appId: string) =>
      [...queryKeys.devices.all, "overview", appId] as const,
    timeseries: (appId: string, params?: Record<string, unknown>) =>
      [...queryKeys.devices.all, "timeseries", appId, params] as const,
  },
  sessions: {
    all: ["sessions"] as const,
    lists: () => [...queryKeys.sessions.all, "list"] as const,
    list: (
      appId: string,
      filters?: PaginationQueryParams & DateFilterQueryParams & { deviceId?: string }
    ) => [...queryKeys.sessions.lists(), appId, filters] as const,
    overview: (appId: string) =>
      [...queryKeys.sessions.all, "overview", appId] as const,
    timeseries: (appId: string, params?: Record<string, unknown>) =>
      [...queryKeys.sessions.all, "timeseries", appId, params] as const,
  },
  events: {
    all: ["events"] as const,
    lists: () => [...queryKeys.events.all, "list"] as const,
    list: (
      appId: string,
      filters?: PaginationQueryParams &
        DateFilterQueryParams & {
          sessionId?: string;
          deviceId?: string;
          eventName?: string;
        }
    ) => [...queryKeys.events.lists(), appId, filters] as const,
    overview: (appId: string) =>
      [...queryKeys.events.all, "overview", appId] as const,
    top: (appId: string, filters?: DateFilterQueryParams) =>
      [...queryKeys.events.all, "top", appId, filters] as const,
    timeseries: (appId: string, params?: Record<string, unknown>) =>
      [...queryKeys.events.all, "timeseries", appId, params] as const,
  },
  links: {
    all: ["links"] as const,
    list: (appId: string) => [...queryKeys.links.all, "list", appId] as const,
    detail: (appId: string, linkId: string) =>
      [...queryKeys.links.all, "detail", appId, linkId] as const,
    analytics: (appId: string, linkId: string) =>
      [...queryKeys.links.all, "analytics", appId, linkId] as const,
    domains: (appId: string) =>
      [...queryKeys.links.all, "domains", appId] as const,
  },
} as const;
