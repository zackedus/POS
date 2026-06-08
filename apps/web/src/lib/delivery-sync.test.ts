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

  it('forwards delivery:created socket payload via subscribeDeliveryEvents', async () => {
    const { subscribeDeliveryEvents } = await import('./socket-client');
    const handlers = new Map<string, (payload: unknown) => void>();
    const socket = {
      on: vi.fn((event: string, handler: (payload: unknown) => void) => {
        handlers.set(event, handler);
      }),
      off: vi.fn(),
    };
    const handler = vi.fn();
    subscribeDeliveryEvents(socket as never, handler);

    handlers.get('delivery:created')?.({
      deliveryId: 'del-1',
      deliveryNo: 'DLV-20260609-0001',
      outletId: 'outlet-1',
      deliveryType: 'STORE_DIRECT',
      status: 'MENUNGGU',
    });

    expect(handler).toHaveBeenCalledWith({
      type: 'created',
      deliveryId: 'del-1',
      deliveryNo: 'DLV-20260609-0001',
      outletId: 'outlet-1',
      deliveryType: 'STORE_DIRECT',
      status: 'MENUNGGU',
    });
  });
});
