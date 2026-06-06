'use client';

import { useEffect } from 'react';
import { isChunkLoadError, tryRecoverFromChunkError } from '@/lib/chunk-load-recovery';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const chunkError = isChunkLoadError(error);

  useEffect(() => {
    if (chunkError && tryRecoverFromChunkError('global')) return;
  }, [chunkError, error]);

  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0f172a' }}>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              maxWidth: '420px',
              width: '100%',
              background: '#fff',
              borderRadius: '16px',
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>
              {chunkError ? 'Aplikasi perlu dimuat ulang' : 'Terjadi kesalahan'}
            </h1>
            <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.875rem' }}>
              {chunkError
                ? 'File JavaScript tidak ditemukan — biasanya karena cache dev kedaluwarsa. Muat ulang halaman.'
                : 'Silakan coba lagi.'}
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
      </body>
    </html>
  );
}
