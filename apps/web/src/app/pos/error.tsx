'use client';

import { useEffect } from 'react';
import { isChunkLoadError, tryRecoverFromChunkError } from '@/lib/chunk-load-recovery';

type PosErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function PosError({ error, reset }: PosErrorProps) {
  const chunkError = isChunkLoadError(error);

  useEffect(() => {
    if (chunkError && tryRecoverFromChunkError('pos')) return;
  }, [chunkError, error]);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: '#f8fafc',
      }}
    >
      <div
        style={{
          maxWidth: '420px',
          width: '100%',
          background: '#fff',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
        }}
      >
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#0f172a' }}>
          {chunkError ? 'Halaman kasir perlu dimuat ulang' : 'Terjadi kesalahan'}
        </h1>
        <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.875rem' }}>
          {chunkError
            ? 'Cache browser atau build dev kedaluwarsa. Muat ulang halaman untuk melanjutkan.'
            : 'Silakan coba lagi. Jika masalah berlanjut, hubungi admin toko.'}
        </p>
        <button
          type="button"
          onClick={() => (chunkError ? window.location.reload() : reset())}
          style={{
            width: '100%',
            minHeight: 48,
            border: 'none',
            borderRadius: '8px',
            background: '#16a34a',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {chunkError ? 'Muat ulang halaman' : 'Coba lagi'}
        </button>
      </div>
    </main>
  );
}
