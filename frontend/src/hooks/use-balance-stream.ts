import { useState, useEffect, useRef } from 'react';

// Define the shape of the messages we expect from the server
export type BalanceUpdateMessage = {
  type: 'balance';
  data: {
    available: number;
    pending: number;
    updatedAt: string;
  };
};

export type TransactionMessage = {
  type: 'transaction';
  data: {
    id: string;
    type: 'credit' | 'debit';
    amount: number;
    currency: string;
    description: string;
    date: string;
  };
};

export type ServerMessage = BalanceUpdateMessage | TransactionMessage;

export type BalanceStreamStatus = 'connecting' | 'active' | 'disconnected';

// Define the options for the hook
export interface UseBalanceStreamOptions {
  url?: string; // The URL of the SSE endpoint
  withCredentials?: boolean; // Whether to include cookies in the request
  onMessage?: (message: ServerMessage) => void; // Callback for every message
  onError?: (error: Event) => void; // Callback for stream errors
}

// Define the return value of the hook
export interface BalanceStreamState {
  balance: number | null;
  status: BalanceStreamStatus;
  lastMessage: ServerMessage | null;
  error: Event | null;
}

const defaultOptions: Required<Pick<UseBalanceStreamOptions, 'url' | 'withCredentials'>> = {
  url: '/api/balance/stream',
  withCredentials: true,
};

const RECONNECT_DELAY = 1000;

/**
 * A React hook that keeps up-to-date with the user's balance via a Server-Sent Events (SSE) stream.
 */
export const useBalanceStream = (options: UseBalanceStreamOptions = {}): BalanceStreamState => {
  const finalOptions = { ...defaultOptions, ...options };
  const [balance, setBalance] = useState<number | null>(null);
  const [status, setStatus] = useState<BalanceStreamStatus>('connecting');
  const [lastMessage, setLastMessage] = useState<ServerMessage | null>(null);
  const [error, setError] = useState<Event | null>(null);

  // Use a ref to hold the EventSource instance so it doesn't get recreated on every render
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use a ref to hold the latest onMessage callback to avoid re-running the effect when it changes
  const onMessageRef = useRef(options.onMessage);
  useEffect(() => {
    onMessageRef.current = options.onMessage;
  }, [options.onMessage]);

  useEffect(() => {
    let isUnmounted = false;

    const cleanupReconnectTimeout = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const connect = () => {
      if (isUnmounted) {
        return;
      }

      setStatus('connecting');
      const eventSource = new EventSource(finalOptions.url, { withCredentials: finalOptions.withCredentials });
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (isUnmounted) {
          return;
        }
        setStatus('active');
        setError(null);
      };

      eventSource.onerror = (err) => {
        if (isUnmounted) {
          return;
        }

        setError(err);
        if (options.onError) {
          options.onError(err);
        }

        if (eventSource.readyState === EventSource.CLOSED) {
          setStatus('connecting');
          eventSource.close();
          eventSourceRef.current = null;

          cleanupReconnectTimeout();
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY);
          return;
        }

        if (eventSource.readyState === EventSource.CONNECTING) {
          setStatus('connecting');
          return;
        }

        setStatus('disconnected');
      };

      eventSource.onmessage = (event) => {
        if (isUnmounted) {
          return;
        }

        try {
          const parsedMessage: ServerMessage = JSON.parse(event.data);
          setLastMessage(parsedMessage);

          if (parsedMessage.type === 'balance') {
            setBalance(parsedMessage.data.available);
          }

          if (onMessageRef.current) {
            onMessageRef.current(parsedMessage);
          }
        } catch (e) {
          console.error('Failed to parse SSE message:', event.data, e);
        }
      };
    };

    connect();

    // Cleanup function to close the connection when the component unmounts
    return () => {
      isUnmounted = true;
      cleanupReconnectTimeout();
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [finalOptions.url, finalOptions.withCredentials, options.onError]);

  return { balance, status, lastMessage, error };
};