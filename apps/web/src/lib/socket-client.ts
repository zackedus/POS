import { io, type Socket } from 'socket.io-client';
import { DEFAULT_API_PORT } from '@barokah/shared';
import { tokenStorage } from './auth';

const API_HOST = process.env.NEXT_PUBLIC_API_URL ?? `http://localhost:${DEFAULT_API_PORT}`;
const SOCKET_ENABLED = process.env.NEXT_PUBLIC_SOCKET_ENABLED !== 'false';

export function isSocketEnabled(): boolean {
  return SOCKET_ENABLED;
}

export function connectRealtimeSocket(outletId?: string | null): Socket | null {
  if (!SOCKET_ENABLED || typeof window === 'undefined') {
    return null;
  }
  const token = tokenStorage.getAccessToken?.();
  if (!token) return null;

  return io(`${API_HOST}/realtime`, {
    transports: ['websocket', 'polling'],
    auth: {
      token,
      outletId: outletId ?? undefined,
    },
    reconnection: true,
    reconnectionAttempts: 5,
  });
}

export type OnlineOrderSocketEvent =
  | { type: 'paid'; orderId: string; orderNo: string; outletId: string; status?: string }
  | { type: 'updated'; orderId: string; orderNo: string; outletId: string; status?: string };

export type DeliverySocketEvent = {
  deliveryId: string;
  deliveryNo: string;
  outletId: string;
  status?: string;
};

export function subscribeDeliveryEvents(
  socket: Socket,
  handler: (event: DeliverySocketEvent) => void,
): () => void {
  const onCreated = (payload: DeliverySocketEvent) => handler(payload);
  const onUpdated = (payload: DeliverySocketEvent) => handler(payload);

  socket.on('delivery:created', onCreated);
  socket.on('delivery:updated', onUpdated);

  return () => {
    socket.off('delivery:created', onCreated);
    socket.off('delivery:updated', onUpdated);
  };
}

export function subscribeOnlineOrderEvents(
  socket: Socket,
  handler: (event: OnlineOrderSocketEvent) => void,
): () => void {
  const onPaid = (payload: { orderId: string; orderNo: string; outletId: string; status?: string }) => {
    handler({ type: 'paid', ...payload });
  };
  const onUpdated = (payload: { orderId: string; orderNo: string; outletId: string; status?: string }) => {
    handler({ type: 'updated', ...payload });
  };

  socket.on('online-order:paid', onPaid);
  socket.on('online-order:updated', onUpdated);

  return () => {
    socket.off('online-order:paid', onPaid);
    socket.off('online-order:updated', onUpdated);
  };
}
