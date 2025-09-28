import { useState, useEffect, useRef } from 'react';

import type { Transaction } from "@/types/balance";

// Define the shape of the messages we expect from the server
export type BalanceUpdateMessage = {
  type: 'balance';
  data: {
    balance: number;
  };
};

type RawTransactionPayload = Transaction & { timestamp?: string };

export type TransactionMessage = {
  type: 'transaction';
  data: Transaction;
};

type RawServerMessage = BalanceUpdateMessage | { type: 'transaction'; data: RawTransactionPayload };

export type ServerMessage = BalanceUpdateMessage | TransactionMessage;

export type BalanceStreamStatus = 'connecting' | 'connected' | 'disconnected';

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
  url: '/api/balance-stream',
  withCredentials: true,
};

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

  // Use a ref to hold the latest onMessage callback to avoid re-running the effect when it changes
  const onMessageRef = useRef(options.onMessage);
  useEffect(() => {
    onMessageRef.current = options.onMessage;
  }, [options.onMessage]);

  useEffect(() => {
    setStatus('connecting');
    const eventSource = new EventSource(finalOptions.url, { withCredentials: finalOptions.withCredentials });
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setStatus('connected');
      setError(null);
    };

    eventSource.onerror = (err) => {
      setStatus('disconnected');
      setError(err);
      if (options.onError) {
        options.onError(err);
      }
      // The browser will automatically try to reconnect, so we don't need to close here
    };

    eventSource.onmessage = (event) => {
      try {
        const parsedMessage: RawServerMessage = JSON.parse(event.data);

        const normalisedMessage: ServerMessage = parsedMessage.type === 'transaction'
          ? {
              type: 'transaction',
              data: {
                ...parsedMessage.data,
                date: parsedMessage.data.date ?? parsedMessage.data.timestamp ?? new Date().toISOString(),
              },
            }
          : parsedMessage;

        setLastMessage(normalisedMessage);

        if (normalisedMessage.type === 'balance') {
          setBalance(normalisedMessage.data.balance);
        }

        // Call the user-provided callback
        if (onMessageRef.current) {
          onMessageRef.current(normalisedMessage);
        }
      } catch (e) {
        console.error('Failed to parse SSE message:', event.data, e);
      }
    };

    // Cleanup function to close the connection when the component unmounts
    return () => {
      if (eventSource) {
        eventSource.close();
        eventSourceRef.current = null;
      }
    };
  }, [finalOptions.url, finalOptions.withCredentials, options.onError]);

  return { balance, status, lastMessage, error };
};