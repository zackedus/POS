import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OfflineBanner } from './OfflineBanner';

describe('OfflineBanner', () => {
  it('renders offline headline when disconnected', () => {
    render(
      <OfflineBanner
        isOnline={false}
        pendingCount={0}
        syncing={false}
        syncMessage={null}
        onSyncNow={vi.fn()}
      />,
    );

    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
    expect(screen.getByText(/Mode offline/i)).toBeInTheDocument();
  });

  it('shows pending count and sync button when online with queue', () => {
    const onSyncNow = vi.fn();
    render(
      <OfflineBanner
        isOnline
        pendingCount={3}
        syncing={false}
        syncMessage={null}
        onSyncNow={onSyncNow}
      />,
    );

    expect(screen.getByText(/3 item antrean menunggu sinkronisasi/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Sinkronkan Sekarang/i }));
    expect(onSyncNow).toHaveBeenCalledTimes(1);
  });

  it('renders conflict panel with resolve actions', () => {
    const onResolve = vi.fn();
    render(
      <OfflineBanner
        isOnline
        pendingCount={0}
        conflictCount={1}
        conflicts={[
          {
            id: 'sq-1',
            clientRequestId: 'offline-req-abc',
            operation: 'CHECKOUT_CASH',
            conflictCode: 'INSUFFICIENT_STOCK',
            conflictMessage: 'Stok habis',
            deviceId: null,
            clientCreatedAt: null,
            processedAt: null,
            queuedAt: '2026-06-02T10:00:00.000Z',
          },
        ]}
        syncing={false}
        syncMessage={null}
        onSyncNow={vi.fn()}
        onResolveConflict={onResolve}
      />,
    );

    expect(screen.getByTestId('sync-conflicts-panel')).toBeInTheDocument();
    expect(screen.getByText(/Stok tidak mencukupi/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Batalkan antrean/i }));
    expect(onResolve).toHaveBeenCalledWith(
      expect.objectContaining({ clientRequestId: 'offline-req-abc' }),
      'CANCEL',
    );
  });

  it('hides when online with empty queue and no message', () => {
    const { container } = render(
      <OfflineBanner
        isOnline
        pendingCount={0}
        syncing={false}
        syncMessage={null}
        onSyncNow={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
