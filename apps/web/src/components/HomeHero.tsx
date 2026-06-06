'use client';

import Link from 'next/link';
import { APP_NAME } from '@barokah/shared';
import { Button } from '@barokah/ui';

const FEATURES = [
  { icon: '▣', title: 'Kasir Cepat', desc: 'Scan barcode, multi-pembayaran, hold transaksi' },
  { icon: '◫', title: 'Dashboard Lengkap', desc: 'Omzet harian, stok, laporan shift' },
  { icon: '◎', title: 'Toko Online', desc: 'Katalog web terintegrasi dengan stok toko' },
] as const;

export function HomeHero() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(160deg, #0f172a 0%, #14532d 50%, #0f172a 100%)',
        color: '#f8fafc',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '1.125rem', color: '#4ade80' }}>{APP_NAME}</span>
        <Link href="/login" style={{ textDecoration: 'none' }}>
          <Button variant="ghost" style={{ color: '#f8fafc', borderColor: 'rgba(255,255,255,0.2)' }}>
            Masuk
          </Button>
        </Link>
      </header>

      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem 1.5rem',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            margin: '0 0 0.75rem',
            padding: '0.35rem 0.875rem',
            borderRadius: '999px',
            background: 'rgba(34,197,94,0.15)',
            color: '#86efac',
            fontSize: '0.8125rem',
            fontWeight: 600,
          }}
        >
          Retail POS Omnichannel
        </p>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', margin: '0 0 1rem', fontWeight: 700, lineHeight: 1.2 }}>
          Kelola toko bahan bangunan
          <br />
          <span style={{ color: '#4ade80' }}>lebih mudah &amp; informatif</span>
        </h1>
        <p style={{ opacity: 0.85, marginBottom: '2rem', maxWidth: '520px', fontSize: '1.0625rem', lineHeight: 1.6 }}>
          Kasir touch-first, dashboard manajemen, dan toko online — semua terintegrasi dalam satu platform Barokah Core.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '3rem' }}>
          <Link href="/pos" style={{ textDecoration: 'none' }}>
            <Button variant="primary" style={{ minHeight: 48, padding: '0 1.5rem', fontSize: '1rem' }}>
              Buka Kasir
            </Button>
          </Link>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <Button
              variant="secondary"
              style={{ minHeight: 48, padding: '0 1.5rem', fontSize: '1rem', background: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }}
            >
              Dashboard
            </Button>
          </Link>
          <Link href="/store/barokah-bangunan" style={{ textDecoration: 'none' }}>
            <Button
              variant="ghost"
              style={{ minHeight: 48, padding: '0 1.5rem', fontSize: '1rem', color: '#86efac', borderColor: 'rgba(134,239,172,0.4)' }}
            >
              Toko Online
            </Button>
          </Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            maxWidth: '720px',
            width: '100%',
          }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                padding: '1.25rem',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '1.5rem' }} aria-hidden>
                {f.icon}
              </span>
              <p style={{ margin: '0.5rem 0 0.25rem', fontWeight: 600, fontSize: '0.9375rem' }}>{f.title}</p>
              <p style={{ margin: 0, opacity: 0.75, fontSize: '0.8125rem', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8125rem', opacity: 0.5 }}>
        © 2026 Barokah Core · POS Profesional Retail
      </footer>
    </main>
  );
}
