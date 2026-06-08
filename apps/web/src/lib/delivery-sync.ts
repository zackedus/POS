export const DELIVERY_CREATED_EVENT = 'barokah:delivery-created';
export const DELIVERY_BROADCAST_CHANNEL = 'barokah:deliveries';

export type DeliverySyncDetail = {
  deliveryNo: string;
  deliveryId?: string;
  outletId?: string | null;
};

/** Notify same-tab listeners and other browser tabs that a delivery was created. */
export function publishDeliveryCreated(detail: DeliverySyncDetail): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent<DeliverySyncDetail>(DELIVERY_CREATED_EVENT, { detail }));

  try {
    const channel = new BroadcastChannel(DELIVERY_BROADCAST_CHANNEL);
    channel.postMessage({ type: 'created', ...detail });
    channel.close();
  } catch {
    // BroadcastChannel unsupported (SSR, older browsers).
  }
}

/** Subscribe to delivery-created signals from POS (same tab + cross-tab). */
export function subscribeDeliverySync(onEvent: (detail: DeliverySyncDetail) => void): () => void {
  const onWindow = (event: Event) => {
    const detail = (event as CustomEvent<DeliverySyncDetail>).detail;
    if (detail?.deliveryNo) {
      onEvent(detail);
    }
  };

  window.addEventListener(DELIVERY_CREATED_EVENT, onWindow);

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(DELIVERY_BROADCAST_CHANNEL);
    channel.onmessage = (message: MessageEvent<{ type?: string; deliveryNo?: string; deliveryId?: string; outletId?: string | null }>) => {
      if (message.data?.type === 'created' && message.data.deliveryNo) {
        onEvent({
          deliveryNo: message.data.deliveryNo,
          deliveryId: message.data.deliveryId,
          outletId: message.data.outletId,
        });
      }
    };
  } catch {
    // BroadcastChannel unsupported.
  }

  return () => {
    window.removeEventListener(DELIVERY_CREATED_EVENT, onWindow);
    channel?.close();
  };
}
