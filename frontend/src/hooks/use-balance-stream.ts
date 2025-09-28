import { useEffect, useRef, useState } from 'react';

type BalanceStreamStatus = 'idle' | 'connecting' | 'active' | 'disconnected';

export interface UseBalanceStreamOptions<TMessage = unknown> {
  url: string;
  /**
   * Pass `true` to send cookies with the stream request.
   */
  withCredentials?: boolean;
  /**
   * Optional custom parser for incoming messages.
   */
  parser?: (event: MessageEvent<string>) => TMessage;
  /**
   * Callback invoked for every parsed message.
   */
  onMessage?: (payload: TMessage) => void;
}

export interface UseBalanceStreamState<TMessage = unknown> {
  status: BalanceStreamStatus;
  latestMessage: TMessage | null;
}

const defaultParser = <TMessage,>(event: MessageEvent<string>): TMessage => {
  const { data } = event;

  if (!data) {
    return undefined as TMessage;
  }

  try {
    return JSON.parse(data) as TMessage;
  } catch {
    return (data as unknown) as TMessage;
  }
};

/**
 * React hook that keeps an EventSource connection to the balance stream.
 */
export const useBalanceStream = <TMessage = unknown>(
  options: UseBalanceStreamOptions<TMessage>,
): UseBalanceStreamState<TMessage> => {
  const { url, withCredentials } = options;
  const messageHandlerRef = useRef(options.onMessage);
  const parserRef = useRef(options.parser);

  messageHandlerRef.current = options.onMessage;
  parserRef.current = options.parser;

  const [status, setStatus] = useState<BalanceStreamStatus>('idle');
  const [latestMessage, setLatestMessage] = useState<TMessage | null>(null);

  useEffect(() => {
    if (!url) {
      setStatus('idle');
      setLatestMessage(null);
      return;
    }

    let isUnmounted = false;
    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const clearReconnectTimer = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const cleanupSource = () => {
      if (source) {
        source.close();
        source = null;
      }
    };

    const scheduleReconnect = (currentSource: EventSource) => {
      if (isUnmounted || reconnectTimer) {
        return;
      }

      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;

        if (isUnmounted || source !== currentSource) {
          return;
        }

        connect();
      }, 1000);
    };

    const connect = () => {
      if (isUnmounted) {
        return;
      }

      cleanupSource();
      setStatus('connecting');

      const nextSource = new EventSource(url, { withCredentials });
      source = nextSource;

      nextSource.onopen = () => {
        if (!isUnmounted && source === nextSource) {
          setStatus('active');
        }
      };

      nextSource.onmessage = (event: MessageEvent<string>) => {
        if (isUnmounted || source !== nextSource) {
          return;
        }

        const parser = parserRef.current ?? defaultParser<TMessage>;
        let parsed: TMessage;

        try {
          parsed = parser(event);
        } catch (error) {
          console.error('Failed to parse balance stream message', error);
          return;
        }

        setLatestMessage(parsed);
        messageHandlerRef.current?.(parsed);
      };

      nextSource.onerror = () => {
        if (isUnmounted || source !== nextSource) {
          return;
        }

        setStatus('connecting');

        if (nextSource.readyState === EventSource.CLOSED) {
          scheduleReconnect(nextSource);
        }
      };
    };

    setLatestMessage(null);
    connect();

    return () => {
      isUnmounted = true;
      clearReconnectTimer();
      cleanupSource();
    };
  }, [url, withCredentials]);

  return { status, latestMessage };
};

export type { BalanceStreamStatus };
