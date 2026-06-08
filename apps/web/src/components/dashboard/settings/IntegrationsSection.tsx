'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@barokah/ui';
import { AlertBanner, cardStyle, LoadingSkeleton, PageHeader } from '@/components/dashboard/dashboard-ui';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { fetchTenantSettings, midtransModeLabel, testMidtransConnection } from '@/lib/settings-api';
import { apiConfig } from '@/lib/api';
import { mapApiError } from '@/lib/api-client';

function CopyField({ label, value }: { label: string; value: string }) {
  const { tokens } = useAdminTheme();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
      {label}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          readOnly
          value={value}
          style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: 8,
            border: `1px solid ${tokens.cardBorder}`,
            fontFamily: 'monospace',
            fontSize: '0.8125rem',
          }}
        />
        <Button type="button" variant="secondary" onClick={() => void copy()}>
          {copied ? 'Tersalin' : 'Salin'}
        </Button>
      </div>
    </label>
  );
}

export function IntegrationsSection({ embedded = false }: { embedded?: boolean }) {
  const { tokens } = useAdminTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [midtransMode, setMidtransMode] = useState<string>('—');
  const [webhookPath, setWebhookPath] = useState('');
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const webhookFullUrl = webhookPath ? `${apiConfig.baseUrl}${webhookPath}` : '—';
  const healthUrl = `${apiConfig.baseUrl}/${apiConfig.prefix}/webhooks/midtrans/online/health`;

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const settings = await fetchTenantSettings();
        setMidtransMode(midtransModeLabel(settings.midtrans.mode));
        setWebhookPath(settings.midtrans.webhookPath);
      } catch (err) {
        setError(mapApiError(err, 'Gagal memuat integrasi.'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleTestMidtrans() {
    setTesting(true);
    setTestMessage(null);
    try {
      const result = await testMidtransConnection();
      setTestMessage(result.message);
    } catch (err) {
      setTestMessage(mapApiError(err, 'Tes koneksi gagal.'));
    } finally {
      setTesting(false);
    }
  }

  return (
    <div>
      {!embedded ? (
        <PageHeader
          title="Integrasi & API"
          description="Webhook Midtrans, status QRIS mock/sandbox, dan tautan dokumentasi. Public API keys — Fase 3."
          actions={
            <Link href="/dashboard/settings?tab=integrasi" style={{ textDecoration: 'none' }}>
              <Button type="button" variant="secondary">
                Pengaturan lengkap
              </Button>
            </Link>
          }
        />
      ) : null}

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <>
          <section style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}`, marginBottom: '1rem' })}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.0625rem' }}>Midtrans & QRIS</h3>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: tokens.muted }}>
              Mode saat ini: <strong>{midtransMode}</strong>
            </p>
            <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: tokens.muted }}>
              Konfigurasi server key & production toggle ada di tab Pembayaran pada Pengaturan Aplikasi.
            </p>
            <CopyField label="Webhook Midtrans (POST)" value={webhookFullUrl} />
            <div style={{ marginTop: '0.75rem' }}>
              <CopyField label="Health check webhook (GET)" value={healthUrl} />
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button type="button" variant="primary" disabled={testing} onClick={() => void handleTestMidtrans()}>
                {testing ? 'Menguji…' : 'Tes koneksi Midtrans'}
              </Button>
              <Link href="/dashboard/settings?tab=pembayaran" style={{ textDecoration: 'none' }}>
                <Button type="button" variant="secondary">
                  Edit kunci Midtrans
                </Button>
              </Link>
            </div>
            {testMessage ? (
              <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: tokens.muted }}>{testMessage}</p>
            ) : null}
          </section>

          <section style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}`, marginBottom: '1rem' })}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.0625rem' }}>Dokumentasi API</h3>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: 1.7 }}>
              <li>
                <a href="/docs/api/" target="_blank" rel="noreferrer" style={{ color: '#16a34a' }}>
                  Error codes & envelope API
                </a>{' '}
                (repo: <code>docs/api/</code>)
              </li>
              <li>
                Storefront publik: <code>GET/POST /api/v1/store/:slug/…</code>
              </li>
              <li>
                Member register: <code>POST /api/v1/store/:slug/register</code>
              </li>
            </ul>
          </section>

          <section style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.0625rem' }}>Coming soon (Fase 3)</h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {[
                { title: 'EDC / Terminal fisik', note: 'Integrasi hardware — Arif' },
                { title: 'WhatsApp Business API', note: 'Notifikasi order & promo' },
                { title: 'Public API keys', note: 'Partner & ERP white-label' },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 8,
                    border: `1px dashed ${tokens.cardBorder}`,
                    opacity: 0.85,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{item.title}</div>
                  <div style={{ fontSize: '0.8125rem', color: tokens.muted }}>{item.note}</div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
