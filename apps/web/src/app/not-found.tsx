'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchMe, tokenStorage } from '@/lib/auth';
import { canAccessDashboard } from '@/lib/rbac';

export default function NotFoundPage() {
  const [homeHref, setHomeHref] = useState<'/pos' | '/dashboard'>('/pos');

  useEffect(() => {
    if (!tokenStorage.getAccessToken()) return;

    let cancelled = false;
    void fetchMe()
      .then((user) => {
        if (!cancelled) {
          setHomeHref(canAccessDashboard(user.role) ? '/dashboard' : '/pos');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHomeHref('/pos');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const homeLabel = homeHref === '/dashboard' ? 'Kembali ke Dashboard' : 'Kembali ke POS';

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
        background: '#f8fafc',
        color: '#0f172a',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 460,
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          background: '#ffffff',
          padding: '1.5rem',
        }}
      >
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem' }}>Halaman tidak ditemukan</h1>
        <p style={{ margin: '0 0 1rem', color: '#475569' }}>
          URL yang Anda buka tidak tersedia. Kembali ke halaman utama untuk melanjutkan operasional.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href={homeHref} style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
            {homeLabel}
          </Link>
          {homeHref === '/dashboard' ? (
            <Link href="/pos" style={{ color: '#64748b', fontSize: '0.875rem', textDecoration: 'none' }}>
              Atau buka layar kasir
            </Link>
          ) : (
            <Link href="/dashboard" style={{ color: '#64748b', fontSize: '0.875rem', textDecoration: 'none' }}>
              Atau buka dashboard admin
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
