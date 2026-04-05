import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

type SSEHandler = (data: any) => void;

interface SSEOptions {
  onOrderCreated?: SSEHandler;
  onOrderStatusUpdated?: SSEHandler;
  onPaymentConfirmed?: SSEHandler;
  onSessionOpened?: SSEHandler;
  onSessionClosing?: SSEHandler;
  onSessionClosed?: SSEHandler;
  onOrderItemUpdated?: SSEHandler;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function useSSE(options: SSEOptions) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(1000);

  const connect = () => {
    if (!isAuthenticated) return;

    const token = sessionStorage.getItem('accessToken');
    if (!token) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      // EventSource doesn't support custom headers natively,
      // so we pass token as query param for SSE
      const url = `${API_BASE}/events?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url, { withCredentials: true });

      es.onopen = () => {
        reconnectDelay.current = 1000; // reset backoff
        options.onConnected?.();
      };

      es.addEventListener('connected', (e: MessageEvent) => {
        console.log('📡 SSE connected:', JSON.parse(e.data));
      });

      es.addEventListener('order:created', (e: MessageEvent) => {
        options.onOrderCreated?.(JSON.parse(e.data));
      });

      es.addEventListener('order:status_updated', (e: MessageEvent) => {
        options.onOrderStatusUpdated?.(JSON.parse(e.data));
      });

      es.addEventListener('order:item_updated', (e: MessageEvent) => {
        options.onOrderItemUpdated?.(JSON.parse(e.data));
      });

      es.addEventListener('payment:confirmed', (e: MessageEvent) => {
        options.onPaymentConfirmed?.(JSON.parse(e.data));
      });

      es.addEventListener('session:opened', (e: MessageEvent) => {
        options.onSessionOpened?.(JSON.parse(e.data));
      });

      es.addEventListener('session:closing', (e: MessageEvent) => {
        options.onSessionClosing?.(JSON.parse(e.data));
      });

      es.addEventListener('session:closed', (e: MessageEvent) => {
        options.onSessionClosed?.(JSON.parse(e.data));
      });

      es.addEventListener('ping', () => {
        // Heartbeat — no action needed
      });

      es.onerror = () => {
        es.close();
        options.onDisconnected?.();

        // Exponential backoff reconnect (max 30s)
        const delay = Math.min(reconnectDelay.current, 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectDelay.current = Math.min(delay * 2, 30000);
          connect();
        }, delay);
      };

      eventSourceRef.current = es;
    } catch (err) {
      console.error('SSE connection error:', err);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isAuthenticated]);
}
