import { useCallback, useEffect, useRef, useState } from 'react';
import { MARKETPLACE_ORDER_CHANNELS } from '@barokah/shared';
import { fetchFulfillmentQueue, type FulfillmentChannelFilter } from '@/lib/online-orders-api';
import {
  connectRealtimeSocket,
  isSocketEnabled,
  subscribeOnlineOrderEvents,
} from '@/lib/socket-client';

/** Poll interval for kasir online-order badge (fallback when Socket.io unavailable). */
export const ONLINE_ORDERS_POLL_MS = 15_000;

export type OnlineOrderBadgeChannel = 'WEB' | 'MARKETPLACE';

export interface OnlineOrderBadgeOptions {
  outletId?: string | null;
  /** Filter badge count by sales channel */
  channel?: OnlineOrderBadgeChannel;
  /** Fired when queue count increases (polling or Socket.io). */
  onCountIncrease?: (nextCount: number, delta: number) => void;
  /** Fired on realtime paid event (immediate toast). */
  onRealtimePaid?: (orderNo: string) => void;
}

function resolveChannelFilter(channel?: OnlineOrderBadgeChannel): FulfillmentChannelFilter | undefined {
  if (channel === 'WEB') return 'WEB';
  if (channel === 'MARKETPLACE') return MARKETPLACE_ORDER_CHANNELS;
  return undefined;
}

export function useOnlineOrderBadge(enabled: boolean, options?: OnlineOrderBadgeOptions): number {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const onCountIncrease = options?.onCountIncrease;
  const onRealtimePaid = options?.onRealtimePaid;
  const outletId = options?.outletId;
  const channelFilter = resolveChannelFilter(options?.channel);

  const applyCount = useCallback(
    (nextCount: number, source: 'poll' | 'socket') => {
      const prevCount = countRef.current;
      if (nextCount > prevCount && (prevCount > 0 || source === 'socket')) {
        onCountIncrease?.(nextCount, Math.max(1, nextCount - prevCount));
      }
      countRef.current = nextCount;
      setCount(nextCount);
    },
    [onCountIncrease],
  );

  const refresh = useCallback(async () => {
    try {
      const result = await fetchFulfillmentQueue({
        outletId: outletId ?? undefined,
        channel: channelFilter,
      });
      applyCount(result.meta.total, 'poll');
    } catch {
      // Silent poll — badge is best-effort; errors surface on fulfillment page.
    }
  }, [applyCount, outletId, channelFilter]);

  useEffect(() => {
    if (!enabled) {
      countRef.current = 0;
      setCount(0);
      return;
    }

    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, ONLINE_ORDERS_POLL_MS);

    return () => window.clearInterval(timer);
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled || !isSocketEnabled()) {
      return;
    }

    const socket = connectRealtimeSocket(outletId);
    if (!socket) return;

    const unsubscribe = subscribeOnlineOrderEvents(socket, (event) => {
      if (event.type === 'paid') {
        onRealtimePaid?.(event.orderNo);
        void refresh().then(() => {
          applyCount(countRef.current, 'socket');
        });
      } else if (event.type === 'updated' && event.status === 'PAID') {
        void refresh();
      }
    });

    return () => {
      unsubscribe();
      socket.disconnect();
    };
  }, [enabled, outletId, onRealtimePaid, refresh, applyCount]);

  return count;
}
