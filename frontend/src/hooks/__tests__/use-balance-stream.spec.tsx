// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { useBalanceStream } from '../use-balance-stream';

type EventSourceEventMap = {
  open: Event;
  error: Event;
  message: MessageEvent<string>;
};

class MockEventSource extends EventTarget {
  public static instances: MockEventSource[] = [];
  public static CONNECTING = 0;
  public static OPEN = 1;
  public static CLOSED = 2;
  public readyState = MockEventSource.CONNECTING;
  public onopen: ((this: EventSource, ev: EventSourceEventMap['open']) => void) | null = null;
  public onerror: ((this: EventSource, ev: EventSourceEventMap['error']) => void) | null = null;
  public onmessage:
    | ((this: EventSource, ev: EventSourceEventMap['message']) => void)
    | null = null;
  public close = vi.fn();

  constructor(public url: string, public init?: EventSourceInit) {
    super();
    MockEventSource.instances.push(this);
  }

  emitOpen() {
    this.readyState = MockEventSource.OPEN;
    this.onopen?.call(this as unknown as EventSource, new Event('open'));
  }

  emitError(nextState = MockEventSource.CONNECTING) {
    this.readyState = nextState;
    this.onerror?.call(this as unknown as EventSource, new Event('error'));
  }

  emitMessage(data: string) {
    const event = new MessageEvent('message', { data });
    this.onmessage?.call(this as unknown as EventSource, event);
  }
}

type MutableGlobal = typeof globalThis & {
  EventSource?: typeof EventSource;
};

describe('useBalanceStream', () => {
  let originalEventSource: typeof EventSource | undefined;

  beforeEach(() => {
    MockEventSource.instances = [];
    vi.restoreAllMocks();
    originalEventSource = globalThis.EventSource;
    (globalThis as MutableGlobal).EventSource =
      MockEventSource as unknown as typeof EventSource;
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Ensure global EventSource is cleaned up between tests
    const globalWithEventSource = globalThis as MutableGlobal;

    if (originalEventSource) {
      globalWithEventSource.EventSource = originalEventSource;
      return;
    }

    delete globalWithEventSource.EventSource;
  });

  it('restores the stream after a transient error', () => {
    vi.useFakeTimers();

    try {
      const onMessage = vi.fn();
      const { result, unmount } = renderHook(() => useBalanceStream({ url: '/stream', onMessage }));

      expect(result.current.status).toBe('connecting');

      const source = MockEventSource.instances[0];
      expect(source).toBeDefined();

      act(() => {
        source.emitOpen();
      });

      expect(result.current.status).toBe('active');

      act(() => {
        source.emitMessage(
          JSON.stringify({
            type: 'balance',
            data: {
              available: 150,
              pending: 25,
              updatedAt: '2024-01-01T00:00:00.000Z',
            },
          }),
        );
      });

      expect(result.current.balance).toBe(150);
      expect(onMessage).toHaveBeenCalledWith({
        type: 'balance',
        data: {
          available: 150,
          pending: 25,
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      });

      act(() => {
        source.emitMessage(
          JSON.stringify({
            type: 'transaction',
            data: {
              id: 'tx-1',
              type: 'credit',
              amount: 99.5,
              currency: 'USD',
              description: 'Test credit',
              date: '2024-01-01T00:00:01.000Z',
            },
          }),
        );
      });

      expect(onMessage).toHaveBeenLastCalledWith({
        type: 'transaction',
        data: {
          id: 'tx-1',
          type: 'credit',
          amount: 99.5,
          currency: 'USD',
          description: 'Test credit',
          date: '2024-01-01T00:00:01.000Z',
        },
      });

      act(() => {
        source.emitError(MockEventSource.CLOSED);
      });

      expect(result.current.status).toBe('connecting');

      expect(source.close).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      const nextSource = MockEventSource.instances[1];
      expect(nextSource).toBeDefined();
      expect(source.close).toHaveBeenCalledTimes(1);

      act(() => {
        nextSource.emitOpen();
      });

      expect(result.current.status).toBe('active');

      act(() => {
        nextSource.emitMessage(
          JSON.stringify({
            type: 'balance',
            data: {
              available: 200,
              pending: 50,
              updatedAt: '2024-01-01T00:05:00.000Z',
            },
          }),
        );
      });

      expect(onMessage).toHaveBeenLastCalledWith({
        type: 'balance',
        data: {
          available: 200,
          pending: 50,
          updatedAt: '2024-01-01T00:05:00.000Z',
        },
      });

      unmount();

      expect(nextSource.close).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('recovers connection state after browser-managed retry', () => {
    vi.useFakeTimers();

    try {
      const { result, unmount } = renderHook(() => useBalanceStream({ url: '/stream' }));

      const source = MockEventSource.instances[0];
      expect(source).toBeDefined();

      act(() => {
        source.emitOpen();
      });

      expect(result.current.status).toBe('active');

      act(() => {
        source.emitError(MockEventSource.CONNECTING);
      });

      expect(result.current.status).toBe('connecting');
      expect(source.close).not.toHaveBeenCalled();

      act(() => {
        source.emitOpen();
      });

      expect(result.current.status).toBe('active');

      unmount();
    } finally {
      vi.useRealTimers();
    }
  });
});
