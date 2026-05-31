import type {
  CreateLinkDomainRequest,
  CreateLinkRequest,
  LinkAnalyticsResponse,
  LinkClicksListResponse,
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
import { buildQueryString, fetchApi, fetchApiFormData } from '@/lib/api/client';
import type { DateRangeParams, PaginationQueryParams } from '@/lib/api/types';
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

export function useLinkClicks(
  appId: string,
  linkId: string,
  params: PaginationQueryParams & DateRangeParams
) {
  return useQuery({
    queryKey: queryKeys.links.clicks(appId, linkId, params),
    queryFn: () =>
      fetchApi<LinkClicksListResponse>(
        `/web/links/${linkId}/clicks${buildQueryString({
          appId,
          ...params,
        })}`
      ),
    ...cacheConfig.list,
    enabled: Boolean(appId) && Boolean(linkId),
    refetchInterval: 5000,
  });
}

export function useLinkAnalytics(appId: string, linkId: string, range: string) {
  return useQuery({
    queryKey: queryKeys.links.analytics(appId, linkId, range),
    queryFn: () =>
      fetchApi<LinkAnalyticsResponse>(
        `/web/links/${linkId}/analytics${buildQueryString({ appId, range })}`
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

export function useUploadLinkOgImage(appId: string, linkId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return fetchApiFormData<LinkDetail>(
        `/web/links/${linkId}/og-image${buildQueryString({ appId })}`,
        formData
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.detail(appId, linkId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.list(appId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.clicks(appId, linkId),
      });
    },
  });
}

export function useDeleteLinkOgImage(appId: string, linkId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      fetchApi<LinkDetail>(
        `/web/links/${linkId}/og-image${buildQueryString({ appId })}`,
        { method: 'DELETE' }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.detail(appId, linkId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.list(appId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.clicks(appId, linkId),
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
