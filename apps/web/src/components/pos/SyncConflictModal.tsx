'use client';

import { Button } from '@barokah/ui';
import type { SyncConflictResolutionAction } from '@barokah/shared';
import {
  getConflictActionLabel,
  getConflictActions,
  getConflictStrategyLabel,
  getConflictUserMessage,
  type SyncConflictItem,
} from '@/lib/sync-conflicts';

export interface SyncConflictModalProps {
  open: boolean;
  conflicts: SyncConflictItem[];
  dismissedIds: string[];
  syncing: boolean;
  onClose: () => void;
  onResolve: (conflict: SyncConflictItem, action: SyncConflictResolutionAction) => void;
}

export function SyncConflictModal({
  open,
  conflicts,
  dismissedIds,
  syncing,
  onClose,
  onResolve,
}: SyncConflictModalProps) {
  if (!open) {
    return null;
  }

  const visible = conflicts.filter((c) => !dismissedIds.includes(c.id));
  if (visible.length === 0) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-conflict-modal-title"
      data-testid="sync-conflict-modal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          width: 'min(520px, 100%)',
          maxHeight: '85vh',
          overflow: 'auto',
          background: '#fff',
          borderRadius: 12,
          padding: '1.25rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
        }}
      >
        <h2 id="sync-conflict-modal-title" style={{ margin: '0 0 0.35rem', fontSize: '1.125rem' }}>
          Selesaikan Konflik Sinkronisasi
        </h2>
        <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#64748b' }}>
          Pilih tindakan untuk setiap transaksi offline yang bentrok dengan server.
        </p>

        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.75rem' }}>
          {visible.map((conflict) => {
            const actions = getConflictActions(conflict.conflictCode);
            return (
              <li
                key={conflict.id}
                data-testid={`sync-conflict-modal-${conflict.clientRequestId}`}
                style={{
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  padding: '0.75rem',
                  background: '#fef2f2',
                }}
              >
                <p style={{ margin: '0 0 0.35rem', fontSize: '0.875rem', color: '#7f1d1d' }}>
                  {getConflictUserMessage(conflict.conflictCode, conflict.conflictMessage)}
                </p>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: '#9f1239' }}>
                  Strategi: {getConflictStrategyLabel(conflict.conflictCode)} · ID{' '}
                  {conflict.clientRequestId.slice(0, 12)}…
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {actions.map((action) => (
                    <Button
                      key={action}
                      type="button"
                      variant={action === 'USE_SERVER' || action === 'KEEP_CLIENT' ? 'secondary' : 'ghost'}
                      disabled={syncing}
                      onClick={() => onResolve(conflict, action)}
                    >
                      {getConflictActionLabel(action)}
                    </Button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="button" variant="ghost" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
