import type {
  CreateLinkDomainRequest,
  CreateLinkRequest,
  LinkAnalyticsResponse,
  LinkDetail,
  LinkDomainsListResponseSchema,
  LinksListResponse,
  SlugAvailableResponseSchema,
  UpdateLinkRequest,
} from '@phase/shared';
import type { z } from 'zod';

type LinkDomainsListResponse = z.infer<typeof LinkDomainsListResponseSchema>;
type SlugAvailableResponse = z.infer<typeof SlugAvailableResponseSchema>;

import type { LinkDomain } from '@phase/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { buildQueryString, fetchApi } from '@/lib/api/client';
import { cacheConfig } from './query-client';
import { queryKeys } from './query-keys';

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

export function useLinkSlugAvailable(slug: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.links.slugAvailable(slug),
    queryFn: () =>
      fetchApi<SlugAvailableResponse>(
        `/web/links/slug-available${buildQueryString({ slug })}`
      ),
    enabled: enabled && slug.length >= 3,
    staleTime: 10_000,
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
      fetchApi<LinkDetail>('/web/links', {
        method: 'POST',
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
          method: 'PATCH',
          body: JSON.stringify(payload),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.list(appId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.detail(appId, linkId),
      });
    },
  });
}

export function useDeleteLink(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (linkId: string) =>
      fetchApi<{ success: boolean }>(
        `/web/links/${linkId}${buildQueryString({ appId })}`,
        { method: 'DELETE' }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.list(appId),
      });
    },
  });
}

export function useCreateLinkDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateLinkDomainRequest) =>
      fetchApi('/web/links/domains', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.domains(variables.appId),
      });
    },
  });
}

export function useVerifyLinkDomain(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (domainId: string) =>
      fetchApi<LinkDomain>(
        `/web/links/domains/${domainId}/verify${buildQueryString({ appId })}`,
        {
          method: 'POST',
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.domains(appId),
      });
    },
  });
}

export function useDeleteLinkDomain(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (domainId: string) =>
      fetchApi(`/web/links/domains/${domainId}${buildQueryString({ appId })}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.domains(appId),
      });
    },
  });
}
