import { useCallback, useEffect, useState } from 'react';
import { getTodayDate } from '@barokah/shared';
import { fetchDeliveryQueueSummary } from '@/lib/deliveries-api';
import { useDeliverySyncRefresh } from './useDeliverySyncRefresh';

export function useDeliveryBadge(enabled: boolean, outletId?: string | null): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const today = getTodayDate();
      const summary = await fetchDeliveryQueueSummary({
        outletId: outletId ?? undefined,
        dateFrom: today,
        dateTo: today,
      });
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
  }, [enabled, refresh]);

  useDeliverySyncRefresh({
    enabled,
    outletId,
    onRefresh: refresh,
  });

  return count;
}
