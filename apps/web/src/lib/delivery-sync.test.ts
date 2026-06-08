import { describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import {
  DELIVERY_BROADCAST_CHANNEL,
  DELIVERY_CREATED_EVENT,
  publishDeliveryCreated,
  subscribeDeliverySync,
} from './delivery-sync';

describe('delivery-sync', () => {
  it('dispatches window event on publishDeliveryCreated', () => {
    const handler = vi.fn();
    window.addEventListener(DELIVERY_CREATED_EVENT, handler as EventListener);

    publishDeliveryCreated({ deliveryNo: 'DLV-20260609-0001', outletId: 'outlet-1' });

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0]?.[0] as CustomEvent;
    expect(event.detail).toEqual({
      deliveryNo: 'DLV-20260609-0001',
      outletId: 'outlet-1',
    });

    window.removeEventListener(DELIVERY_CREATED_EVENT, handler as EventListener);
  });

  it('notifies subscribers from BroadcastChannel messages', async () => {
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }

    const onEvent = vi.fn();
    const unsubscribe = subscribeDeliverySync(onEvent);

    const channel = new BroadcastChannel(DELIVERY_BROADCAST_CHANNEL);
    channel.postMessage({
      type: 'created',
      deliveryNo: 'DLV-20260609-0002',
      outletId: 'outlet-2',
    });
    channel.close();

    await waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith({
        deliveryNo: 'DLV-20260609-0002',
        deliveryId: undefined,
        outletId: 'outlet-2',
      });
    });

    unsubscribe();
  });
});
