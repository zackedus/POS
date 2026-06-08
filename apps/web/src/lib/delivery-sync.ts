export const DELIVERY_CREATED_EVENT = 'barokah:delivery-created';
export const DELIVERY_UPDATED_EVENT = 'barokah:delivery-updated';
export const DELIVERY_BROADCAST_CHANNEL = 'barokah:deliveries';

export type DeliverySyncDetail = {
  deliveryNo: string;
  deliveryId?: string;
  outletId?: string | null;
  status?: string;
};

type BroadcastMessage = DeliverySyncDetail & { type: 'created' | 'updated' };

function publishDeliveryEvent(type: BroadcastMessage['type'], detail: DeliverySyncDetail): void {
  if (typeof window === 'undefined') {
    return;
  }

  const eventName = type === 'created' ? DELIVERY_CREATED_EVENT : DELIVERY_UPDATED_EVENT;
  window.dispatchEvent(new CustomEvent<DeliverySyncDetail>(eventName, { detail }));

  try {
    const channel = new BroadcastChannel(DELIVERY_BROADCAST_CHANNEL);
    channel.postMessage({ type, ...detail });
    channel.close();
  } catch {
    // BroadcastChannel unsupported (SSR, older browsers).
  }
}

/** Notify same-tab listeners and other browser tabs that a delivery was created. */
export function publishDeliveryCreated(detail: DeliverySyncDetail): void {
  publishDeliveryEvent('created', detail);
}

/** Notify listeners that delivery status changed (dashboard / POS). */
export function publishDeliveryUpdated(detail: DeliverySyncDetail): void {
  publishDeliveryEvent('updated', detail);
}

/** Subscribe to delivery sync signals (same tab + cross-tab). */
export function subscribeDeliverySync(onEvent: (detail: DeliverySyncDetail) => void): () => void {
  const onWindowCreated = (event: Event) => {
    const detail = (event as CustomEvent<DeliverySyncDetail>).detail;
    if (detail?.deliveryNo) {
      onEvent(detail);
    }
  };
  const onWindowUpdated = (event: Event) => {
    const detail = (event as CustomEvent<DeliverySyncDetail>).detail;
    if (detail?.deliveryNo) {
      onEvent(detail);
    }
  };

  window.addEventListener(DELIVERY_CREATED_EVENT, onWindowCreated);
  window.addEventListener(DELIVERY_UPDATED_EVENT, onWindowUpdated);

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(DELIVERY_BROADCAST_CHANNEL);
    channel.onmessage = (message: MessageEvent<BroadcastMessage>) => {
      if ((message.data?.type === 'created' || message.data?.type === 'updated') && message.data.deliveryNo) {
        onEvent({
          deliveryNo: message.data.deliveryNo,
          deliveryId: message.data.deliveryId,
          outletId: message.data.outletId,
          status: message.data.status,
        });
      }
    };
  } catch {
    // BroadcastChannel unsupported.
  }

  return () => {
    window.removeEventListener(DELIVERY_CREATED_EVENT, onWindowCreated);
    window.removeEventListener(DELIVERY_UPDATED_EVENT, onWindowUpdated);
    channel?.close();
  };
}
