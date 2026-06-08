import { useEffect, useRef } from 'react';
import { subscribeDeliverySync } from '@/lib/delivery-sync';

export interface DeliverySyncRefreshOptions {
  enabled: boolean;
  outletId?: string | null;
  onRefresh: () => void | Promise<void>;
  /** Optional fallback poll — omit for DB-read-on-focus only. */
  pollMs?: number;
  /** Listen for POS cross-tab broadcast (default true). */
  crossTab?: boolean;
  /** Refetch when tab becomes visible (default true). */
  refetchOnWindowFocus?: boolean;
}

function matchesOutletFilter(eventOutletId: string, filterOutletId?: string | null): boolean {
  if (!filterOutletId) {
    return true;
  }
  return eventOutletId === filterOutletId;
}

export function useDeliverySyncRefresh(options: DeliverySyncRefreshOptions): void {
  const {
    enabled,
    outletId,
    onRefresh,
    pollMs,
    crossTab = true,
    refetchOnWindowFocus = true,
  } = options;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled || !crossTab) {
      return;
    }

    return subscribeDeliverySync((detail) => {
      if (detail.outletId && !matchesOutletFilter(detail.outletId, outletId)) {
        return;
      }
      void onRefreshRef.current();
    });
  }, [enabled, crossTab, outletId]);

  useEffect(() => {
    if (!enabled || !refetchOnWindowFocus || typeof document === 'undefined') {
      return;
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void onRefreshRef.current();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [enabled, refetchOnWindowFocus]);

  useEffect(() => {
    if (!enabled || pollMs == null) {
      return;
    }

    const timer = window.setInterval(() => {
      void onRefreshRef.current();
    }, pollMs);

    return () => window.clearInterval(timer);
  }, [enabled, pollMs]);
}
