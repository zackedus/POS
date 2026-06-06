import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ONLINE_ORDERS_POLL_MS, useOnlineOrderBadge } from './useOnlineOrderBadge';

vi.mock('@/lib/online-orders-api', () => ({
  fetchFulfillmentQueue: vi.fn(),
}));

vi.mock('@/lib/socket-client', () => ({
  isSocketEnabled: vi.fn(() => false),
  connectRealtimeSocket: vi.fn(() => null),
  subscribeOnlineOrderEvents: vi.fn(() => () => undefined),
}));

import { fetchFulfillmentQueue } from '@/lib/online-orders-api';

describe('useOnlineOrderBadge', () => {
  beforeEach(() => {
    vi.mocked(fetchFulfillmentQueue).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('exports poll interval constant', () => {
    expect(ONLINE_ORDERS_POLL_MS).toBe(15_000);
  });

  it('returns zero when disabled', () => {
    const { result } = renderHook(() => useOnlineOrderBadge(false));
    expect(result.current).toBe(0);
  });

  it('polls fulfillment queue when enabled', async () => {
    vi.mocked(fetchFulfillmentQueue).mockResolvedValue([{ id: '1' }, { id: '2' }] as never);
    const { result } = renderHook(() => useOnlineOrderBadge(true));

    await waitFor(() => {
      expect(result.current).toBe(2);
    });
    expect(fetchFulfillmentQueue).toHaveBeenCalled();
  });
});
