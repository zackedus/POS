'use client';

import { Button } from '@barokah/ui';
import type { SyncConflictResolutionAction } from '@barokah/shared';
import {
  getConflictActionLabel,
  getConflictActions,
  getConflictUserMessage,
  type SyncConflictItem,
} from '@/lib/sync-conflicts';

export interface OfflineBannerProps {
  isOnline: boolean;
  pendingCount: number;
  pendingHoldCount?: number;
  conflictCount?: number;
  conflicts?: SyncConflictItem[];
  dismissedConflictIds?: string[];
  syncing: boolean;
  syncMessage: string | null;
  catalogCached?: boolean;
  onSyncNow: () => void;
  onResolveConflict?: (
    conflict: SyncConflictItem,
    action: SyncConflictResolutionAction,
  ) => void;
}

export function OfflineBanner({
  isOnline,
  pendingCount,
  pendingHoldCount = 0,
  conflictCount = 0,
  conflicts = [],
  dismissedConflictIds = [],
  syncing,
  syncMessage,
  catalogCached = false,
  onSyncNow,
  onResolveConflict,
}: OfflineBannerProps) {
  const totalPending = pendingCount + pendingHoldCount;
  const visibleConflicts = conflicts.filter((c) => !dismissedConflictIds.includes(c.id));
  const showBanner =
    !isOnline ||
    totalPending > 0 ||
    conflictCount > 0 ||
    visibleConflicts.length > 0 ||
    Boolean(syncMessage);

  if (!showBanner) {
    return null;
  }

  const tone = !isOnline ? '#92400e' : conflictCount > 0 ? '#991b1b' : totalPending > 0 ? '#1e40af' : '#166534';
  const background = !isOnline ? '#fef3c7' : conflictCount > 0 ? '#fef2f2' : totalPending > 0 ? '#eff6ff' : '#ecfdf5';
  const border = !isOnline ? '#fcd34d' : conflictCount > 0 ? '#fecaca' : totalPending > 0 ? '#93c5fd' : '#86efac';

  let headline = 'Online';
  if (!isOnline) {
    if (totalPending > 0) {
      headline = `Mode offline — ${totalPending} item antrean menunggu sinkronisasi`;
    } else if (catalogCached) {
      headline = 'Mode offline — katalog dari cache lokal (baca saja)';
    } else {
      headline = 'Mode offline — transaksi disimpan lokal';
    }
  } else if (conflictCount > 0) {
    headline = `${conflictCount} konflik sinkronisasi perlu diselesaikan`;
  } else if (totalPending > 0) {
    headline = `${totalPending} item antrean menunggu sinkronisasi`;
  } else if (syncMessage) {
    headline = syncMessage;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-banner"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        padding: '0.65rem 1rem',
        background,
        borderBottom: `1px solid ${border}`,
        color: tone,
        fontSize: '0.9rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: '0.15rem' }}>
          <strong>{headline}</strong>
          {!isOnline ? (
            <span style={{ fontSize: '0.82rem' }}>
              Checkout dan hold masuk antrean IndexedDB; disinkronkan saat internet kembali.
              {catalogCached ? ' Katalog produk dari cache terakhir.' : ''}
            </span>
          ) : null}
          {isOnline && totalPending > 0 ? (
            <span style={{ fontSize: '0.82rem' }}>
              {pendingCount > 0 ? `${pendingCount} transaksi` : null}
              {pendingCount > 0 && pendingHoldCount > 0 ? ', ' : null}
              {pendingHoldCount > 0 ? `${pendingHoldCount} hold` : null}
              {' — tekan sinkronkan untuk mengirim ke server.'}
            </span>
          ) : null}
          {syncMessage && isOnline && totalPending === 0 && conflictCount === 0 ? (
            <span style={{ fontSize: '0.82rem' }}>{syncMessage}</span>
          ) : null}
        </div>
        {isOnline && (totalPending > 0 || conflictCount > 0) ? (
          <Button type="button" variant="secondary" disabled={syncing} onClick={onSyncNow}>
            {syncing ? 'Menyinkronkan…' : 'Sinkronkan Sekarang'}
          </Button>
        ) : null}
      </div>

      {visibleConflicts.length > 0 ? (
        <div
          data-testid="sync-conflicts-panel"
          style={{
            display: 'grid',
            gap: '0.5rem',
            borderTop: `1px solid ${border}`,
            paddingTop: '0.5rem',
          }}
        >
          <strong style={{ fontSize: '0.85rem' }}>Konflik sinkronisasi</strong>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.5rem' }}>
            {visibleConflicts.map((conflict) => {
              const actions = getConflictActions(conflict.conflictCode);
              return (
                <li
                  key={conflict.id}
                  data-testid={`sync-conflict-${conflict.clientRequestId}`}
                  style={{
                    background: '#fff',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    padding: '0.5rem 0.65rem',
                    color: '#7f1d1d',
                  }}
                >
                  <div style={{ fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                    {getConflictUserMessage(conflict.conflictCode, conflict.conflictMessage)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9f1239', marginBottom: '0.4rem' }}>
                    ID: {conflict.clientRequestId.slice(0, 12)}… · {conflict.operation}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {actions.map((action) => (
                      <Button
                        key={action}
                        type="button"
                        variant="ghost"
                        disabled={syncing || !onResolveConflict}
                        onClick={() => onResolveConflict?.(conflict, action)}
                      >
                        {getConflictActionLabel(action)}
                      </Button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
