'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, colors } from '@barokah/ui';
import { PosShiftBar } from '@/components/pos/PosShiftBar';
import { PosFulfillmentQueue } from '@/components/pos/PosFulfillmentQueue';
import { mapApiError } from '@/lib/api-client';
import { fetchMe, tokenStorage, type AuthUser } from '@/lib/auth';
import { fetchFulfillmentQueue, type FulfillmentOrder } from '@/lib/online-orders-api';
import { fetchActiveShift, type ShiftSummary } from '@/lib/shifts-api';
import { useOnlineOrderBadge, ONLINE_ORDERS_POLL_MS } from '@/hooks/useOnlineOrderBadge';
import { useOutletSelection } from '@/lib/outlet-selection-state';

export default function OnlineOrdersFulfillmentPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeShift, setActiveShift] = useState<ShiftSummary | null>(null);
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { outlets, selectedOutletId, needsOutletPick, setSelectedOutletId } = useOutletSelection();
  const shiftOutletMismatch = Boolean(
    selectedOutletId && activeShift?.outletId && activeShift.outletId !== selectedOutletId,
  );

  const onlineOrderCount = useOnlineOrderBadge(Boolean(user), {
    outletId: selectedOutletId ?? undefined,
    channel: 'WEB',
  });
  const marketplaceOrderCount = useOnlineOrderBadge(Boolean(user), {
    outletId: selectedOutletId ?? undefined,
    channel: 'MARKETPLACE',
  });

  useEffect(() => {
    void fetchMe()
      .then(setUser)
      .catch(() => router.replace('/login'));
  }, [router]);

  useEffect(() => {
    void fetchActiveShift(selectedOutletId ?? undefined)
      .then(setActiveShift)
      .catch(() => setActiveShift(null));
  }, [selectedOutletId]);

  const load = useCallback(
    async (silent = false) => {
      if (!selectedOutletId && needsOutletPick) {
        setOrders([]);
        setLoading(false);
        return;
      }
      if (!silent) {
        setLoading(true);
      }
      try {
        const items = await fetchFulfillmentQueue(selectedOutletId ?? undefined, 'WEB');
        setOrders(items);
        setError(null);
        setLastUpdated(new Date());
      } catch (err) {
        setError(mapApiError(err, 'Gagal memuat antrian order web.'));
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [selectedOutletId, needsOutletPick],
  );

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      void load(true);
    }, ONLINE_ORDERS_POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  function handleLogout() {
    tokenStorage.clear();
    router.replace('/login');
  }

  const selectedOutletLabel = outlets.find((o) => o.id === selectedOutletId)?.label;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc' }}>
      {user ? (
        <PosShiftBar
          userName={user.fullName}
          activeShift={activeShift}
          onlineOrderCount={onlineOrderCount}
          marketplaceOrderCount={marketplaceOrderCount}
          outlets={outlets}
          selectedOutletId={selectedOutletId}
          needsOutletPick={needsOutletPick}
          shiftOutletMismatch={shiftOutletMismatch}
          onOutletChange={setSelectedOutletId}
          onLogout={handleLogout}
        />
      ) : null}

      <div style={{ padding: '1rem', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem' }}>Order Web</h1>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: colors.light.text.secondary }}>
              Alur: Order masuk → Konfirmasi → Disiapkan → Cetak label → Kirim → Selesai
              {selectedOutletLabel ? ` · ${selectedOutletLabel}` : ''}
            </p>
            {lastUpdated ? (
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: colors.light.text.secondary }}>
                Pembaruan otomatis setiap {ONLINE_ORDERS_POLL_MS / 1000} detik · terakhir{' '}
                {lastUpdated.toLocaleTimeString('id-ID')}
              </p>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link href="/dashboard/deliveries" style={{ textDecoration: 'none' }}>
              <Button variant="secondary">Antrian pengiriman</Button>
            </Link>
            <Button variant="secondary" onClick={() => void load()}>
              Muat ulang
            </Button>
          </div>
        </div>

        {needsOutletPick ? (
          <div
            role="alert"
            style={{
              padding: '0.75rem',
              marginBottom: '0.75rem',
              borderRadius: 8,
              background: '#fff7ed',
              color: '#9a3412',
              border: '1px solid #fed7aa',
            }}
          >
            Pilih cabang aktif di header untuk melihat order web cabang tersebut.
          </div>
        ) : null}

        <PosFulfillmentQueue
          orders={orders}
          loading={loading}
          error={error}
          needsOutletPick={needsOutletPick}
          selectedOutletId={selectedOutletId}
          emptyTitle="Belum ada order web yang perlu disiapkan"
          emptyDescription="Order baru muncul setelah pembayaran berhasil (status Dibayar) dari storefront web untuk cabang terpilih."
          onReload={() => void load(true)}
        />
      </div>
    </div>
  );
}
