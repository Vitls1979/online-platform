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
  public readyState = 0;
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
    this.readyState = 1;
    this.onopen?.call(this as unknown as EventSource, new Event('open'));
  }

  emitError() {
    this.readyState = 0;
    this.onerror?.call(this as unknown as EventSource, new Event('error'));
  }

  emitMessage(data: string) {
    const event = new MessageEvent('message', { data });
    this.onmessage?.call(this as unknown as EventSource, event);
  }
}

declare global {
  // eslint-disable-next-line no-var
  var EventSource: typeof MockEventSource;
}

describe('useBalanceStream', () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.restoreAllMocks();
    global.EventSource = MockEventSource as unknown as typeof EventSource;
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Ensure global EventSource is cleaned up between tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).EventSource;
  });

  it('restores the stream after a transient error', () => {
    const onMessage = vi.fn();
    const { result, unmount } = renderHook(() =>
      useBalanceStream<{ balance: number }>({ url: '/stream', onMessage }),
    );

    expect(result.current.status).toBe('connecting');

    const source = MockEventSource.instances[0];
    expect(source).toBeDefined();

    act(() => {
      source.emitOpen();
    });

    expect(result.current.status).toBe('active');

    act(() => {
      source.emitMessage(JSON.stringify({ balance: 150 }));
    });

    expect(onMessage).toHaveBeenCalledWith({ balance: 150 });

    act(() => {
      source.emitError();
    });

    expect(result.current.status).toBe('disconnected');
    expect(source.close).not.toHaveBeenCalled();

    act(() => {
      source.emitOpen();
    });

    expect(result.current.status).toBe('active');

    unmount();

    expect(source.close).toHaveBeenCalledTimes(1);
  });
});
