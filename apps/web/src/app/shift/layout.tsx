'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@barokah/ui';
import { HydrationSafeMount } from '@/components/HydrationSafeMount';
import { fetchMe, tokenStorage, type AuthUser } from '@/lib/auth';
import { fetchActiveShift, type ShiftSummary } from '@/lib/shifts-api';

export default function ShiftLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeShift, setActiveShift] = useState<ShiftSummary | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenStorage.getAccessToken()) {
      router.replace('/login');
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const me = await fetchMe();
        const shift = await fetchActiveShift().catch(() => null);
        if (cancelled) return;
        setUser(me);
        setActiveShift(shift);
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
              <Link href="/shift/open" style={{ textDecoration: 'none' }}>
                <Button type="button" variant="ghost">
                  Buka shift
                </Button>
              </Link>
              <Link href="/shift/close" style={{ textDecoration: 'none' }}>
                <Button type="button" variant="ghost">
                  Tutup shift
                </Button>
              </Link>
            </nav>
          </header>
          {children}
        </div>
      )}
    </HydrationSafeMount>
  );
}
