import type {
  CreateLinkDomainRequest,
  CreateLinkRequest,
  LinkAnalyticsResponse,
  LinkDetail,
  LinkDomain,
  LinksListResponse,
  UpdateLinkRequest,
} from "@phase/shared";
import { LinkDomainsListResponseSchema } from "@phase/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";

import { buildQueryString, fetchApi } from "@/lib/api/client";
import { cacheConfig } from "@/lib/api/query-client";
import { queryKeys } from "@/lib/api/query-keys";

type LinkDomainsListResponse = z.infer<typeof LinkDomainsListResponseSchema>;

export function useLinks(appId: string) {
  return useQuery({
    queryKey: queryKeys.links.list(appId),
    queryFn: () =>
      fetchApi<LinksListResponse>(`/web/links${buildQueryString({ appId })}`),
    ...cacheConfig.list,
    enabled: Boolean(appId),
  });
}

export function useLink(appId: string, linkId: string) {
  return useQuery({
    queryKey: queryKeys.links.detail(appId, linkId),
    queryFn: () =>
      fetchApi<LinkDetail>(
        `/web/links/${linkId}${buildQueryString({ appId })}`
      ),
    ...cacheConfig.detail,
    enabled: Boolean(appId) && Boolean(linkId),
  });
}

export function useLinkAnalytics(appId: string, linkId: string) {
  return useQuery({
    queryKey: queryKeys.links.analytics(appId, linkId),
    queryFn: () =>
      fetchApi<LinkAnalyticsResponse>(
        `/web/links/${linkId}/analytics${buildQueryString({ appId })}`
      ),
    ...cacheConfig.list,
    enabled: Boolean(appId) && Boolean(linkId),
  });
}

export function useLinkDomains(appId: string) {
  return useQuery({
    queryKey: queryKeys.links.domains(appId),
    queryFn: () =>
      fetchApi<LinkDomainsListResponse>(
        `/web/links/domains${buildQueryString({ appId })}`
      ),
    ...cacheConfig.list,
    enabled: Boolean(appId),
  });
}

export function useCreateLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateLinkRequest) =>
      fetchApi<LinkDetail>("/web/links", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.list(variables.appId),
      });
    },
  });
}

export function useUpdateLink(appId: string, linkId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateLinkRequest) =>
      fetchApi<LinkDetail>(
        `/web/links/${linkId}${buildQueryString({ appId })}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.detail(appId, linkId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.list(appId),
      });
    },
  });
}

export function useDeleteLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appId, linkId }: { appId: string; linkId: string }) =>
      fetchApi<void>(`/web/links/${linkId}${buildQueryString({ appId })}`, {
        method: "DELETE",
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.list(variables.appId),
      });
    },
  });
}

export function useCreateLinkDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateLinkDomainRequest) =>
      fetchApi<LinkDomain>("/web/links/domains", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.domains(variables.appId),
      });
    },
  });
}

export function useVerifyLinkDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appId,
      domainId,
    }: {
      appId: string;
      domainId: string;
    }) =>
      fetchApi<LinkDomain>(
        `/web/links/domains/${domainId}/verify${buildQueryString({ appId })}`,
        { method: "POST" }
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.domains(variables.appId),
      });
    },
  });
}

export function useDeleteLinkDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appId,
      domainId,
    }: {
      appId: string;
      domainId: string;
    }) =>
      fetchApi<void>(
        `/web/links/domains/${domainId}${buildQueryString({ appId })}`,
        { method: "DELETE" }
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.domains(variables.appId),
      });
    },
  });
}
