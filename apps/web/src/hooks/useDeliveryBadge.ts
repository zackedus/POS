import { useCallback, useEffect, useState } from 'react';
import { fetchDeliveryQueueSummary } from '@/lib/deliveries-api';

export const DELIVERIES_POLL_MS = 30_000;

export function useDeliveryBadge(enabled: boolean, outletId?: string | null): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const summary = await fetchDeliveryQueueSummary(outletId ?? undefined);
      const active = summary.MENUNGGU + summary.DISIAPKAN + summary.DIKIRIM;
      setCount(active);
    } catch {
      // Silent poll — badge is best-effort.
    }
  }, [outletId]);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }
    void refresh();
    const onDeliveryCreated = () => {
      void refresh();
    };
    window.addEventListener('barokah:delivery-created', onDeliveryCreated);
    const timer = window.setInterval(() => {
      void refresh();
    }, DELIVERIES_POLL_MS);
    return () => {
      window.removeEventListener('barokah:delivery-created', onDeliveryCreated);
      window.clearInterval(timer);
    };
  }, [enabled, refresh]);

  return count;
}
