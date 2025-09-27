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

    setStatus('connecting');
    setLatestMessage(null);

    const source = new EventSource(url, { withCredentials });

    source.onopen = () => {
      if (!isUnmounted) {
        setStatus('active');
      }
    };

    source.onmessage = (event: MessageEvent<string>) => {
      if (isUnmounted) {
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

    source.onerror = () => {
      if (!isUnmounted) {
        setStatus('disconnected');
      }
      // Allow the native EventSource instance to handle reconnection attempts.
    };

    return () => {
      isUnmounted = true;
      source.close();
    };
  }, [url, withCredentials]);

  return { status, latestMessage };
};

export type { BalanceStreamStatus };
