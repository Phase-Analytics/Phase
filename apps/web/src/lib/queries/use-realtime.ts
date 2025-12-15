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

export function useRealtime(
  appId: string | undefined,
  options: UseRealtimeOptions = {}
): UseRealtimeReturn {
  const { enabled = true, onMessage, onError } = options;

  const [data, setData] = useState<RealtimeMessage | null>(null);
  const [status, setStatus] = useState<RealtimeStatus>('disconnected');
  const [error, setError] = useState<Event | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!(appId && enabled) || isPaused) {
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStatus('connecting');
    setError(null);

    const url = `${API_BASE}/web/realtime/stream?appId=${appId}`;
    const eventSource = new EventSource(url, { withCredentials: true });

    eventSource.addEventListener('connected', (e) => {
      setStatus('connected');
      const message: RealtimeMessage = JSON.parse(e.data);
      setData(message);
      onMessage?.(message);
    });

    eventSource.addEventListener('realtime', (e) => {
      const message: RealtimeMessage = JSON.parse(e.data);
      setData(message);
      onMessage?.(message);
    });

    eventSource.addEventListener('error', (e) => {
      setStatus('error');
      setError(e);
      onError?.(e);

      if (eventSource.readyState === EventSource.CLOSED) {
        setStatus('disconnected');
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 4000);
      }
    });

    eventSourceRef.current = eventSource;
  }, [appId, enabled, isPaused, onMessage, onError]);

  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    connect();
  }, [connect]);

  const pause = useCallback(() => {
    setIsPaused(true);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    connect();
  }, [connect]);

  useEffect(() => {
    if (enabled && appId && !isPaused) {
      connect();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [appId, enabled, isPaused, connect]);

  return {
    data,
    status,
    error,
    reconnect,
    pause,
    resume,
  };
}
