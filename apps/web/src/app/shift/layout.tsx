'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@barokah/ui';
import { HydrationSafeMount } from '@/components/HydrationSafeMount';
import { fetchMe, hasClientAuthSession, type AuthUser } from '@/lib/auth';
import { fetchActiveShift, type ShiftSummary } from '@/lib/shifts-api';
import { initOutletSelection, useOutletSelection } from '@/lib/outlet-selection-state';
import { fetchOutlets } from '@/lib/reports';

function ShiftLayoutContent({
  user,
  children,
}: {
  user: AuthUser;
  children: React.ReactNode;
}) {
  const { selectedOutletId } = useOutletSelection();
  const [activeShift, setActiveShift] = useState<ShiftSummary | null>(null);

  useEffect(() => {
    void fetchActiveShift(selectedOutletId ?? undefined)
      .then((shift) => setActiveShift(shift))
      .catch(() => setActiveShift(null));
  }, [selectedOutletId]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #e2e8f0',
          background: '#fff',
        }}
      >
        <div>
          <strong>{user.fullName}</strong>
          <span
            style={{
              marginLeft: '0.5rem',
              fontSize: '0.75rem',
              padding: '0.15rem 0.45rem',
              borderRadius: 999,
              background: activeShift ? '#dcfce7' : '#fef3c7',
              color: activeShift ? '#166534' : '#92400e',
            }}
          >
            {activeShift ? 'Shift aktif' : 'Belum buka shift'}
          </span>
        </div>
        <nav style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <Link href="/pos" style={{ textDecoration: 'none' }}>
            <Button type="button" variant="secondary">
              Ke kasir
            </Button>
          </Link>
          <Link href="/shift" style={{ textDecoration: 'none' }}>
            <Button type="button" variant="ghost">
              Shift & Kas
            </Button>
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}

export default function ShiftLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasClientAuthSession()) {
      router.replace('/login');
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        const outlets = await fetchOutlets().catch(() => null);
        if (cancelled) return;
        initOutletSelection(outlets ?? { outletIds: me.outletIds });
        setUser(me);
        setReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Gagal memuat sesi shift.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <HydrationSafeMount>
      {error ? (
        <div style={{ padding: '2rem', color: '#dc2626' }}>
          <p>{error}</p>
          <button type="button" onClick={() => router.replace('/login')} style={{ marginTop: '0.5rem' }}>
            Kembali ke login
          </button>
        </div>
      ) : !ready || !user ? (
        <div style={{ padding: '2rem', color: '#64748b' }} role="status" aria-live="polite">
          Memuat halaman shift…
        </div>
      ) : (
        <ShiftLayoutContent user={user}>{children}</ShiftLayoutContent>
      )}
    </HydrationSafeMount>
  );
}
