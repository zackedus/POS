'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HydrationSafeMount } from '@/components/HydrationSafeMount';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { LoadingSkeleton } from '@/components/dashboard/dashboard-ui';
import { fetchMe, hasClientAuthSession, readClientRoleFromCookie, tokenStorage, persistUserRole, type AuthUser } from '@/lib/auth';
import { initOutletSelection } from '@/lib/outlet-selection-state';
import { fetchOutlets } from '@/lib/reports';
import { canAccessDashboard } from '@/lib/rbac';

function AdminLoadingShell() {
  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f1f5f9' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <div role="status" aria-live="polite" style={{ color: '#64748b', marginBottom: '1rem' }}>
          Memuat halaman admin…
        </div>
        <LoadingSkeleton rows={5} />
      </div>
    </div>
  );
}

function AdminErrorShell({ error, onLogin }: { error: string; onLogin: () => void }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: '#f1f5f9',
      }}
    >
      <div
        style={{
          maxWidth: '400px',
          padding: '1.5rem',
          borderRadius: '12px',
          background: '#fff',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0 }}>{error}</p>
        <button
          type="button"
          onClick={onLogin}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            background: '#16a34a',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Kembali ke login
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const earlyRole = readClientRoleFromCookie() ?? tokenStorage.getRole();
    if (earlyRole === 'CASHIER') {
      router.replace('/pos');
      return;
    }

    if (!hasClientAuthSession()) {
      router.replace('/login');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;

        if (!canAccessDashboard(me.role)) {
          router.replace('/pos');
          return;
        }

        const outlets = await fetchOutlets();
        initOutletSelection(outlets ?? { outletIds: me.outletIds });
        persistUserRole(me.role);
        setUser(me);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Gagal memuat profil.');
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
        <AdminErrorShell error={error} onLogin={() => router.replace('/login')} />
      ) : !user ? (
        <AdminLoadingShell />
      ) : (
        <DashboardShell user={user}>{children}</DashboardShell>
      )}
    </HydrationSafeMount>
  );
}
