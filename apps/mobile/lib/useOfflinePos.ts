import { useCallback, useEffect, useState } from 'react';
import {
  countPendingMobileOffline,
  createClientRequestId,
  enqueueMobileOffline,
  listPendingMobileOffline,
  removeMobileOfflineEntry,
  updateMobileOfflineEntry,
} from './offline-queue';
import { API_BASE } from './api';

async function probeOnline(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${API_BASE.replace('/api/v1', '')}/api/v1/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export function useMobileOfflinePos(accessToken: string | null) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const refreshPending = useCallback(async () => {
    try {
      setPendingCount(await countPendingMobileOffline());
    } catch {
      setPendingCount(0);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!accessToken) {
      return { synced: 0, failed: 0 };
    }

    const online = await probeOnline();
    setIsOnline(online);
    if (!online) {
      setSyncMessage('Offline — sinkronisasi ditunda.');
      return { synced: 0, failed: 0 };
    }

    setSyncing(true);
    setSyncMessage(null);
    let synced = 0;
    let failed = 0;

    try {
      const pending = await listPendingMobileOffline();
      for (const entry of pending) {
        if (entry.kind !== 'checkout-cash') {
          continue;
        }
        await updateMobileOfflineEntry(entry.id, { status: 'syncing' });
        try {
          const payload = entry.payload as {
            items: Array<{ productId: string; quantity: number }>;
            cashReceived: number;
            clientRequestId?: string;
          };
          const res = await fetch(`${API_BASE}/transactions/checkout-cash`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              items: payload.items,
              cashReceived: payload.cashReceived,
              clientRequestId: payload.clientRequestId ?? entry.id,
            }),
          });
          const json = (await res.json()) as { success?: boolean };
          if (!res.ok || !json.success) {
            throw new Error('Sync checkout gagal');
          }
          await removeMobileOfflineEntry(entry.id);
          synced += 1;
        } catch (error) {
          failed += 1;
          await updateMobileOfflineEntry(entry.id, {
            status: 'failed',
            attemptCount: entry.attemptCount + 1,
            lastError: error instanceof Error ? error.message : 'Sync gagal',
          });
        }
      }
      await refreshPending();
      if (synced > 0) {
        setSyncMessage(`${synced} transaksi mobile disinkronkan.`);
      } else if (failed > 0) {
        setSyncMessage(`${failed} item gagal disinkronkan.`);
      }
      return { synced, failed };
    } finally {
      setSyncing(false);
    }
  }, [accessToken, refreshPending]);

  useEffect(() => {
    void refreshPending();
    const timer = setInterval(() => {
      void probeOnline().then((online) => {
        setIsOnline(online);
        if (online) {
          void syncNow();
        }
      });
    }, 15000);
    return () => clearInterval(timer);
  }, [refreshPending, syncNow]);

  const queueCashCheckout = useCallback(
    async (input: {
      items: Array<{ productId: string; quantity: number }>;
      cashReceived: number;
    }) => {
      const id = createClientRequestId();
      await enqueueMobileOffline({
        id,
        kind: 'checkout-cash',
        payload: { ...input, clientRequestId: id },
      });
      await refreshPending();
      return id;
    },
    [refreshPending],
  );

  const queueHoldBill = useCallback(
    async (input: {
      items: Array<{ productId: string; quantity: number }>;
      label?: string;
    }) => {
      const id = createClientRequestId();
      await enqueueMobileOffline({
        id,
        kind: 'hold',
        payload: input,
      });
      await refreshPending();
      return id;
    },
    [refreshPending],
  );

  return {
    isOnline,
    pendingCount,
    syncing,
    syncMessage,
    refreshPending,
    syncNow,
    queueCashCheckout,
    queueHoldBill,
  };
}
