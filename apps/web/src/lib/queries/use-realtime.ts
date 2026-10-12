import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from '@/lib/api/client';
import type { RealtimeMessage } from '@/lib/api/types';

type RealtimeStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

type UseRealtimeOptions = {
  enabled?: boolean;
  onMessage?: (data: RealtimeMessage) => void;
  onError?: (error: Event) => void;
};

type UseRealtimeReturn = {
  data: RealtimeMessage | null;
  status: RealtimeStatus;
  error: Event | null;
  reconnect: () => void;
  pause: () => void;
  resume: () => void;
};

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30_000;

function getReconnectDelay(attempt: number): number {
  const ceiling = Math.min(
    RECONNECT_MAX_DELAY_MS,
    RECONNECT_BASE_DELAY_MS * 2 ** attempt
  );
  // Equal jitter: spreads reconnect storms after a server restart.
  return ceiling / 2 + Math.random() * (ceiling / 2);
}

export function useRealtime(
  appId: string | undefined,
  options: UseRealtimeOptions = {}
): UseRealtimeReturn {
  const { enabled = true, onMessage, onError } = options;

  const [data, setData] = useState<RealtimeMessage | null>(null);
  const [status, setStatus] = useState<RealtimeStatus>('disconnected');
  const [error, setError] = useState<Event | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [connectionNonce, setConnectionNonce] = useState(0);

  // Latest handlers live in refs so a new callback identity never tears down
  // the EventSource; only appId/enabled/pause/reconnect do.
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: connectionNonce forces a fresh connection on reconnect()
  useEffect(() => {
    if (!(appId && enabled) || isPaused) {
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let disposed = false;

    const handleMessage = (e: MessageEvent<string>) => {
      const message = JSON.parse(e.data) as RealtimeMessage;
      setData(message);
      onMessageRef.current?.(message);
    };

    const connect = () => {
      setStatus('connecting');
      setError(null);

      const source = new EventSource(
        `${API_BASE}/web/realtime/stream?appId=${encodeURIComponent(appId)}`,
        { withCredentials: true }
      );
      eventSource = source;

      source.addEventListener('connected', (e) => {
        attempt = 0;
        setStatus('connected');
        handleMessage(e);
      });

      source.addEventListener('realtime', handleMessage);

      source.addEventListener('error', (e) => {
        setStatus('error');
        setError(e);
        onErrorRef.current?.(e);

        // The browser retries on its own unless the stream was closed.
        if (source.readyState === EventSource.CLOSED && !disposed) {
          setStatus('disconnected');
          reconnectTimeout = setTimeout(connect, getReconnectDelay(attempt));
          attempt += 1;
        }
      });
    };

    connect();

    return () => {
      disposed = true;
      eventSource?.close();
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [appId, enabled, isPaused, connectionNonce]);

  const reconnect = useCallback(() => {
    setConnectionNonce((n) => n + 1);
  }, []);

  const pause = useCallback(() => {
    setIsPaused(true);
    setStatus('disconnected');
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  return {
    data,
    status,
    error,
    reconnect,
    pause,
    resume,
  };
}
