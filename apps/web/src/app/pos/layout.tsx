'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@barokah/ui';
import { HydrationSafeMount } from '@/components/HydrationSafeMount';
import { hasClientAuthSession } from '@/lib/auth';
import { fetchActiveShift } from '@/lib/shifts-api';
import { registerPosServiceWorker } from '@/lib/pwa-register';
import { useChunkLoadRecovery } from '@/lib/use-chunk-load-recovery';

export default function PosLayout({ children }: { children: React.ReactNode }) {
  useChunkLoadRecovery('pos');
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [shiftOpen, setShiftOpen] = useState<boolean | null>(null);

  useEffect(() => {
    if (!hasClientAuthSession()) {
      router.replace('/login');
      return;
    }
    void registerPosServiceWorker();
    setReady(true);
    void fetchActiveShift()
      .then((shift) => setShiftOpen(Boolean(shift)))
      .catch(() => setShiftOpen(null));
  }, [router]);

  return (
    <HydrationSafeMount>
      {!ready ? (
        <div style={{ padding: '2rem', color: '#64748b' }} role="status" aria-live="polite">
          Memuat sesi kasir…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
          {shiftOpen === false ? (
            <div
              role="alert"
              style={{
                padding: '0.75rem 1rem',
                background: '#fffbeb',
                borderBottom: '1px solid #fcd34d',
                color: '#92400e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <span>
                <strong>Shift belum dibuka.</strong> Buka shift terlebih dahulu sebelum transaksi kasir.
              </span>
              <Link href="/shift/open" style={{ textDecoration: 'none' }}>
                <Button type="button" variant="secondary">
                  Buka shift
                </Button>
              </Link>
            </div>
          ) : null}
          {children}
        </div>
      )}
    </HydrationSafeMount>
  );
}
