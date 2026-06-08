import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDeliverySyncRefresh } from './useDeliverySyncRefresh';

vi.mock('@/lib/delivery-sync', () => ({
  subscribeDeliverySync: vi.fn(() => () => undefined),
}));

vi.mock('@/lib/socket-client', () => ({
  isSocketEnabled: () => false,
  connectRealtimeSocket: vi.fn(),
  subscribeDeliveryEvents: vi.fn(() => () => undefined),
}));

import { subscribeDeliverySync } from '@/lib/delivery-sync';

describe('useDeliverySyncRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('subscribes to cross-tab delivery sync when enabled', () => {
    const onRefresh = vi.fn();
    renderHook(() =>
      useDeliverySyncRefresh({
        enabled: true,
        outletId: 'outlet-1',
        onRefresh,
      }),
    );

    expect(subscribeDeliverySync).toHaveBeenCalled();
  });

  it('polls only when pollMs is provided', () => {
    const onRefresh = vi.fn();
    renderHook(() =>
      useDeliverySyncRefresh({
        enabled: true,
        onRefresh,
        pollMs: 1_000,
      }),
    );

    expect(onRefresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('refetches when tab becomes visible', () => {
    const onRefresh = vi.fn();
    renderHook(() =>
      useDeliverySyncRefresh({
        enabled: true,
        onRefresh,
        refetchOnWindowFocus: true,
      }),
    );

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
