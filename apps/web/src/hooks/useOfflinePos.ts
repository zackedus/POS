'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SyncConflictResolutionAction } from '@barokah/shared';
import {
  countPendingOfflineTransactions,
  createClientRequestId,
  enqueueOfflineTransaction,
  getOfflineQueueEntryByClientRequestId,
  removeOfflineQueueEntry,
  type OfflineCheckoutCashPayload,
  type OfflineCheckoutSplitPayload,
  updateOfflineQueueEntry,
} from '@/lib/offline-queue';
import { countPendingOfflineHolds, enqueueOfflineHold } from '@/lib/offline-hold-queue';
import { syncOfflineHoldQueue } from '@/lib/offline-hold-sync';
import { isBrowserOnline, syncOfflineQueue, syncOfflineQueueEntry } from '@/lib/offline-sync';
import {
  fetchSyncConflicts,
  recordConflictResolution,
  type SyncConflictItem,
} from '@/lib/sync-conflicts';

export function useOfflinePos() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingHoldCount, setPendingHoldCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
  const [conflicts, setConflicts] = useState<SyncConflictItem[]>([]);
  const [dismissedConflictIds, setDismissedConflictIds] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const refreshPendingCount = useCallback(async () => {
    try {
      const [txn, hold] = await Promise.all([
        countPendingOfflineTransactions(),
        countPendingOfflineHolds(),
      ]);
      setPendingCount(txn);
      setPendingHoldCount(hold);
    } catch {
      setPendingCount(0);
      setPendingHoldCount(0);
    }
  }, []);

  const refreshConflicts = useCallback(async () => {
    if (!isBrowserOnline()) {
      setConflicts([]);
      setConflictCount(0);
      return;
    }
    try {
      const data = await fetchSyncConflicts();
      setConflicts(data.conflicts);
      setConflictCount(data.total);
    } catch {
      setConflicts([]);
      setConflictCount(0);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!isBrowserOnline()) {
      setSyncMessage('Masih offline — sinkronisasi ditunda hingga koneksi pulih.');
      return { synced: [], failed: [], holdSynced: [], holdFailed: [] };
    }

    setSyncing(true);
    setSyncMessage(null);
    try {
      const [txnSummary, holdSummary] = await Promise.all([
        syncOfflineQueue(),
        syncOfflineHoldQueue(),
      ]);
      await refreshPendingCount();
      await refreshConflicts();

      const parts: string[] = [];
      if (txnSummary.synced.length > 0) {
        parts.push(`${txnSummary.synced.length} transaksi`);
      }
      if (holdSummary.synced.length > 0) {
        parts.push(`${holdSummary.synced.length} hold`);
      }
      const failedTotal = txnSummary.failed.length + holdSummary.failed.length;
      const syncedTotal = txnSummary.synced.length + holdSummary.synced.length;

      if (syncedTotal > 0 && failedTotal === 0) {
        setSyncMessage(`${parts.join(' dan ')} berhasil disinkronkan.`);
      } else if (syncedTotal > 0 && failedTotal > 0) {
        setSyncMessage(
          `${parts.join(' dan ')} berhasil; ${failedTotal} gagal — periksa konflik di banner.`,
        );
      } else if (failedTotal > 0) {
        setSyncMessage(`${failedTotal} item gagal — selesaikan konflik di banner.`);
      } else {
        setSyncMessage(null);
      }

      return {
        ...txnSummary,
        holdSynced: holdSummary.synced,
        holdFailed: holdSummary.failed,
      };
    } finally {
      setSyncing(false);
    }
  }, [refreshConflicts, refreshPendingCount]);

  const resolveConflict = useCallback(
    async (conflict: SyncConflictItem, action: SyncConflictResolutionAction) => {
      recordConflictResolution(conflict.id, action);

      if (action === 'CANCEL' || action === 'USE_SERVER') {
        const local = await getOfflineQueueEntryByClientRequestId(conflict.clientRequestId);
        if (local) {
          await removeOfflineQueueEntry(local.id);
        }
        setDismissedConflictIds((prev) => [...prev, conflict.id]);
        await refreshPendingCount();
        await refreshConflicts();
        setSyncMessage(
          action === 'USE_SERVER'
            ? 'Antrean lokal dibatalkan — kondisi server diterima.'
            : 'Antrean dibatalkan. Konflik dihapus dari daftar.',
        );
        return;
      }

      if (action === 'RETRY' || action === 'KEEP_CLIENT') {
        const local = await getOfflineQueueEntryByClientRequestId(conflict.clientRequestId);
        if (local) {
          await updateOfflineQueueEntry(local.id, {
            status: 'pending',
            lastError: undefined,
          });
          if (isBrowserOnline()) {
            await syncOfflineQueueEntry({ ...local, status: 'pending' });
            await refreshPendingCount();
            await refreshConflicts();
            setSyncMessage('Sinkronisasi ulang dicoba untuk transaksi ini.');
          }
        } else {
          setSyncMessage('Tidak ada antrean lokal — gunakan sinkronkan atau hubungi manager.');
        }
        return;
      }

      if (action === 'ADJUST_QTY') {
        setSyncMessage('Sesuaikan jumlah di keranjang, lalu coba checkout/sinkron ulang.');
        return;
      }

      if (action === 'ESCALATE_MANAGER') {
        setSyncMessage('Konflik ditandai untuk manager — lanjutkan setelah persetujuan shift/stok.');
        setDismissedConflictIds((prev) => [...prev, conflict.id]);
      }
    },
    [refreshConflicts, refreshPendingCount],
  );

  useEffect(() => {
    setIsOnline(isBrowserOnline());
    void refreshPendingCount();
    void refreshConflicts();

    const handleOnline = () => {
      setIsOnline(true);
      void refreshPendingCount()
        .then(() => refreshConflicts())
        .then(() => syncNow());
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncMessage(null);
      setConflicts([]);
      setConflictCount(0);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshConflicts, refreshPendingCount, syncNow]);

  const queueCashCheckout = useCallback(
    async (input: Omit<OfflineCheckoutCashPayload, 'clientRequestId'>) => {
      const clientRequestId = createClientRequestId();
      await enqueueOfflineTransaction({
        id: clientRequestId,
        kind: 'checkout-cash',
        payload: { ...input, clientRequestId },
      });
      await refreshPendingCount();
      return clientRequestId;
    },
    [refreshPendingCount],
  );

  const queueSplitCheckout = useCallback(
    async (input: Omit<OfflineCheckoutSplitPayload, 'clientRequestId'>) => {
      const clientRequestId = createClientRequestId();
      await enqueueOfflineTransaction({
        id: clientRequestId,
        kind: 'checkout-split',
        payload: { ...input, clientRequestId },
      });
      await refreshPendingCount();
      return clientRequestId;
    },
    [refreshPendingCount],
  );

  const queueHoldBill = useCallback(
    async (input: {
      items: Array<{ productId: string; quantity: number; sellUnitId?: string }>;
      label?: string;
    }) => {
      const entry = await enqueueOfflineHold(input);
      await refreshPendingCount();
      return entry.id;
    },
    [refreshPendingCount],
  );

  return {
    isOnline,
    pendingCount,
    pendingHoldCount,
    conflictCount,
    conflicts,
    dismissedConflictIds,
    syncing,
    syncMessage,
    refreshPendingCount,
    refreshConflicts,
    syncNow,
    resolveConflict,
    queueCashCheckout,
    queueSplitCheckout,
    queueHoldBill,
  };
}
