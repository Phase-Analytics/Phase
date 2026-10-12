import {
  type CreateLinkDomainRequest,
  type CreateLinkRequest,
  type LinkAnalyticsRange,
  type LinkAnalyticsResponse,
  type LinkClicksListResponse,
  type LinkDetail,
  type LinkDomain,
  type LinkDomainsListResponseSchema,
  LinkSlugSchema,
  type LinksListResponse,
  type SlugAvailableResponseSchema,
  type UpdateLinkRequest,
} from '@phase/shared';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { z } from 'zod';
import { buildQueryString, fetchApi, fetchApiFormData } from '@/lib/api/client';
import type { PaginationQueryParams } from '@/lib/api/types';
import { cacheConfig } from './query-client';
import { queryKeys } from './query-keys';

type LinkDomainsListResponse = z.infer<typeof LinkDomainsListResponseSchema>;
type SlugAvailableResponse = z.infer<typeof SlugAvailableResponseSchema>;

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

type LinkSlugAvailabilityOptions = {
  appId: string;
  slug: string;
  domainId: string | null;
  enabled: boolean;
  excludeLinkId?: string;
};

const SLUG_CHECK_DEBOUNCE_MS = 300;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Checks availability once typing pauses, and only for locally valid slugs.
 * `data` is withheld while the input is ahead of the last checked value so a
 * stale answer is never shown for a different slug.
 */
export function useLinkSlugAvailable({
  appId,
  slug,
  domainId,
  enabled,
  excludeLinkId,
}: LinkSlugAvailabilityOptions) {
  const debouncedSlug = useDebouncedValue(slug, SLUG_CHECK_DEBOUNCE_MS);
  const settled = debouncedSlug === slug;
  const query = useQuery({
    queryKey: queryKeys.links.slugAvailable(
      appId,
      debouncedSlug,
      domainId,
      excludeLinkId
    ),
    queryFn: () =>
      fetchApi<SlugAvailableResponse>(
        `/web/links/slug-available${buildQueryString({
          appId,
          slug: debouncedSlug,
          domainId: domainId ?? undefined,
          excludeLinkId,
        })}`
      ),
    enabled:
      enabled &&
      settled &&
      Boolean(appId) &&
      LinkSlugSchema.safeParse(debouncedSlug).success,
    staleTime: 10_000,
  });

  return {
    data: settled ? query.data : undefined,
    isChecking: !settled || query.isFetching,
  };
}

// New clicks arrive via SSE invalidation (useLinkClickLiveUpdates), not polling.
export function useLinkClicks(
  appId: string,
  linkId: string,
  range: LinkAnalyticsRange,
  params: PaginationQueryParams
) {
  return useQuery({
    queryKey: [...queryKeys.links.clicks(appId, linkId, params), range],
    queryFn: () =>
      fetchApi<LinkClicksListResponse>(
        `/web/links/${linkId}/clicks${buildQueryString({
          appId,
          range,
          ...params,
        })}`
      ),
    ...cacheConfig.list,
    enabled: Boolean(appId) && Boolean(linkId),
    placeholderData: keepPreviousData,
  });
}

export function useLinkAnalytics(
  appId: string,
  linkId: string,
  range: LinkAnalyticsRange
) {
  return useQuery({
    queryKey: [...queryKeys.links.analytics(appId, linkId), range],
    queryFn: () =>
      fetchApi<LinkAnalyticsResponse>(
        `/web/links/${linkId}/analytics${buildQueryString({ appId, range })}`
      ),
    ...cacheConfig.list,
    enabled: Boolean(appId) && Boolean(linkId),
    placeholderData: keepPreviousData,
  });
}

const PENDING_DOMAIN_REFETCH_MS = 15_000;

export function useLinkDomains(appId: string) {
  return useQuery({
    queryKey: queryKeys.links.domains(appId),
    queryFn: () =>
      fetchApi<LinkDomainsListResponse>(
        `/web/links/domains${buildQueryString({ appId })}`
      ),
    ...cacheConfig.list,
    enabled: Boolean(appId),
    // Keep pending domains fresh while they are on screen (paused in background tabs).
    refetchInterval: (query) =>
      query.state.data?.domains.some((domain) => domain.status === 'pending')
        ? PENDING_DOMAIN_REFETCH_MS
        : false,
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
      fetchApi<LinkDomain>('/web/links/domains', {
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
    // Failed checks still update lastError / lastCheckAt server-side.
    onSettled: () => {
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
