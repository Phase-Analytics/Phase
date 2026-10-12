import type { RealtimeMessage } from '@phase/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { queryKeys } from './query-keys';
import { useRealtime } from './use-realtime';

// A click is pushed over SSE before it is queryable: the Redis buffer flushes
// every ~2s and QuestDB applies WAL shortly after.
const REFRESH_DELAY_MS = 4000;

/**
 * Refreshes a link's analytics and click list when the realtime stream reports
 * a click on it. Bursts collapse into one refetch per delay window.
 */
export function useLinkClickLiveUpdates(appId: string, linkId: string) {
  const queryClient = useQueryClient();
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (pending.current) {
        clearTimeout(pending.current);
      }
    },
    []
  );

  const onMessage = useCallback(
    (message: RealtimeMessage) => {
      const hit = message.linkClicks?.some((click) => click.linkId === linkId);
      if (!hit || pending.current) {
        return;
      }
      pending.current = setTimeout(() => {
        pending.current = null;
        queryClient.invalidateQueries({
          queryKey: queryKeys.links.analytics(appId, linkId),
        });
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.links.all, 'clicks', appId, linkId],
        });
      }, REFRESH_DELAY_MS);
    },
    [appId, linkId, queryClient]
  );

  useRealtime(appId, { enabled: Boolean(appId && linkId), onMessage });
}
