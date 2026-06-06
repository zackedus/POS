'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@barokah/ui';
import {
  AlertBanner,
  cardStyle,
  LoadingSkeleton,
  PageHeader,
} from '@/components/dashboard/dashboard-ui';
import { fetchMe, type AuthUser } from '@/lib/auth';
import { useOutletSelection } from '@/lib/outlet-selection-state';
import { fetchOutlets, type ReportOutlet } from '@/lib/reports';
import {
  fetchTenantSettings,
  midtransModeLabel,
  testMidtransConnection,
  updateTenantSettings,
  type TenantSettingsView,
} from '@/lib/settings-api';
import { useAdminTheme } from '@/hooks/useAdminTheme';

function roleLabel(role: string): string {
  if (role === 'OWNER') return 'Pemilik';
  if (role === 'MANAGER') return 'Manajer';
  if (role === 'CASHIER') return 'Kasir';
  return role;
}

export default function SettingsPage() {
  const { outlets, selectedOutletId } = useOutletSelection();
  const { tokens } = useAdminTheme();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [reportOutlets, setReportOutlets] = useState<ReportOutlet[]>([]);
  const [tenantSettings, setTenantSettings] = useState<TenantSettingsView | null>(null);
  const [ppnEnabled, setPpnEnabled] = useState(false);
  const [ppnRate, setPpnRate] = useState('11');
  const [midtransKeyInput, setMidtransKeyInput] = useState('');
  const [midtransProduction, setMidtransProduction] = useState(false);
  const [weeklyReportEmail, setWeeklyReportEmail] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [testingMidtrans, setTestingMidtrans] = useState(false);
  const [midtransTestMessage, setMidtransTestMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isOwner = user?.role === 'OWNER';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, outletsRes, settings] = await Promise.all([
        fetchMe(),
        fetchOutlets(),
        fetchTenantSettings(),
      ]);
      setUser(me);
      setReportOutlets(outletsRes?.outlets ?? []);
      setTenantSettings(settings);
      setPpnEnabled(settings.ppnEnabled);
      setPpnRate(String(settings.ppnRatePercent));
      setMidtransProduction(settings.midtrans.isProduction);
      setWeeklyReportEmail(settings.weeklyReportEmailEnabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengaturan.');
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleSaveAdvanced(e: React.FormEvent) {
    e.preventDefault();
    if (!isOwner) return;
    setSavingSettings(true);
    setSettingsMessage(null);
    setError(null);
    try {
      const updated = await updateTenantSettings({
        ppnEnabled,
        ppnRatePercent: Number(ppnRate),
        midtransIsProduction: midtransProduction,
        weeklyReportEmailEnabled: weeklyReportEmail,
        ...(midtransKeyInput.trim() ? { midtransServerKey: midtransKeyInput.trim() } : {}),
      });
      setTenantSettings(updated);
      setMidtransKeyInput('');
      setSettingsMessage('Pengaturan lanjutan berhasil disimpan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan lanjutan.');
    } finally {
      setSavingSettings(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedOutlet = reportOutlets.find((o) => o.id === selectedOutletId) ?? reportOutlets[0];
  const storefrontSlug = user?.tenantSlug;
  const storefrontUrl = storefrontSlug ? `/store/${storefrontSlug}` : null;

  return (
    <div style={{ maxWidth: 900, display: 'grid', gap: '1.25rem' }}>
      <PageHeader
        title="Pengaturan Outlet & Toko"
        description="Informasi tenant, cabang aktif, dan tautan storefront online."
        actions={
          <Button type="button" variant="secondary" onClick={() => void loadData()} disabled={loading}>
            Muat ulang
          </Button>
        }
      />

      {error ? <AlertBanner variant="error" onRetry={() => void loadData()}>{error}</AlertBanner> : null}

      {loading ? (
        <div style={cardStyle()}>
          <LoadingSkeleton rows={4} />
        </div>
      ) : (
        <>
          <section style={cardStyle()} aria-label="Profil tenant">
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>Profil Toko</h3>
            <dl style={{ margin: 0, display: 'grid', gap: '0.75rem', fontSize: '0.9375rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.5rem' }}>
                <dt style={{ color: '#64748b' }}>Nama tenant</dt>
                <dd style={{ margin: 0, fontWeight: 600 }}>{user?.tenantName ?? '—'}</dd>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.5rem' }}>
                <dt style={{ color: '#64748b' }}>Slug storefront</dt>
                <dd style={{ margin: 0, fontFamily: 'monospace' }}>{storefrontSlug ?? '—'}</dd>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.5rem' }}>
                <dt style={{ color: '#64748b' }}>Akun Anda</dt>
                <dd style={{ margin: 0 }}>
                  {user?.fullName} · {user?.email} · {user ? roleLabel(user.role) : '—'}
                </dd>
              </div>
            </dl>
            {storefrontUrl ? (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Link
                  href={storefrontUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '0.5rem 1rem',
                    borderRadius: 8,
                    background: '#16a34a',
                    color: '#fff',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}
                >
                  Buka Storefront Online
                </Link>
                <Link
                  href="/pos/online-orders"
                  style={{
                    display: 'inline-block',
                    padding: '0.5rem 1rem',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    background: '#fff',
                    color: '#334155',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}
                >
                  Antrian Order Online
                </Link>
              </div>
            ) : null}
          </section>

          <section style={cardStyle()} aria-label="Daftar outlet">
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>Cabang / Outlet</h3>
            {reportOutlets.length === 0 ? (
              <p style={{ margin: 0, color: '#64748b' }}>Tidak ada data outlet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem' }}>Nama</th>
                      <th style={{ padding: '0.5rem' }}>Kode</th>
                      <th style={{ padding: '0.5rem' }}>Alamat</th>
                      <th style={{ padding: '0.5rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportOutlets.map((outlet) => {
                      const isSelected = outlet.id === selectedOutletId || outlet.id === selectedOutlet?.id;
                      return (
                        <tr key={outlet.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.65rem 0.5rem', fontWeight: isSelected ? 600 : 400 }}>
                            {outlet.name}
                            {isSelected ? (
                              <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#16a34a' }}>(aktif)</span>
                            ) : null}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', fontFamily: 'monospace' }}>{outlet.code}</td>
                          <td style={{ padding: '0.65rem 0.5rem', color: '#64748b' }}>{outlet.address ?? '—'}</td>
                          <td style={{ padding: '0.65rem 0.5rem', color: outlet.isActive === false ? '#b45309' : '#16a34a' }}>
                            {outlet.isActive === false ? 'Nonaktif' : 'Aktif'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {outlets.length > 1 ? (
              <p style={{ margin: '1rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                Pilih cabang aktif di header untuk modul stok, laporan, dan order distributor.{' '}
                <Link href="/dashboard/outlets" style={{ color: '#2563eb' }}>
                  Kelola cabang →
                </Link>
              </p>
            ) : (
              <p style={{ margin: '1rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                <Link href="/dashboard/outlets" style={{ color: '#2563eb' }}>
                  Kelola cabang →
                </Link>
              </p>
            )}
          </section>

          <section
            style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}
            aria-label="Pajak dan pembayaran"
          >
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', color: tokens.text }}>Pajak & Midtrans</h3>
            {tenantSettings ? (
              <>
                <dl style={{ margin: '0 0 1rem', display: 'grid', gap: '0.65rem', fontSize: '0.9375rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.5rem' }}>
                    <dt style={{ color: tokens.muted }}>Mode Midtrans</dt>
                    <dd style={{ margin: 0, fontWeight: 600 }}>
                      {midtransModeLabel(tenantSettings.midtrans.mode)}
                      <span style={{ marginLeft: 8, fontSize: '0.8125rem', color: tokens.muted }}>
                        (sumber kunci: {tenantSettings.midtrans.keySource})
                      </span>
                    </dd>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.5rem' }}>
                    <dt style={{ color: tokens.muted }}>Server Key</dt>
                    <dd style={{ margin: 0, fontFamily: 'monospace' }}>
                      {tenantSettings.midtrans.serverKeyMasked ?? '— belum dikonfigurasi —'}
                    </dd>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.5rem' }}>
                    <dt style={{ color: tokens.muted }}>Webhook URL</dt>
                    <dd style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                      {tenantSettings.midtrans.webhookPath}
                    </dd>
                  </div>
                </dl>

                {isOwner ? (
                  <form onSubmit={(e) => void handleSaveAdvanced(e)} style={{ display: 'grid', gap: '0.75rem', maxWidth: 480 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9375rem' }}>
                      <input
                        type="checkbox"
                        checked={ppnEnabled}
                        onChange={(e) => setPpnEnabled(e.target.checked)}
                      />
                      Aktifkan PPN pada transaksi (Fase 4 kasir)
                    </label>
                    <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
                      Tarif PPN (%)
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={ppnRate}
                        onChange={(e) => setPpnRate(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: 8, border: `1px solid ${tokens.cardBorder}` }}
                      />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}>
                      <input
                        type="checkbox"
                        checked={midtransProduction}
                        onChange={(e) => setMidtransProduction(e.target.checked)}
                      />
                      Mode produksi Midtrans (live)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}>
                      <input
                        type="checkbox"
                        checked={weeklyReportEmail}
                        onChange={(e) => setWeeklyReportEmail(e.target.checked)}
                      />
                      Kirim laporan analitik mingguan ke email pemilik
                    </label>
                    {tenantSettings.midtrans.productionGuardrails?.warnings.length ? (
                      <div style={{ fontSize: '0.8125rem', color: '#b45309' }}>
                        <strong>Checklist produksi Midtrans:</strong>
                        <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
                          {tenantSettings.midtrans.productionGuardrails.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
                      Sandbox Server Key (opsional, tenant)
                      <input
                        type="password"
                        autoComplete="off"
                        placeholder="SB-Mid-server-… (kosongkan jika pakai env)"
                        value={midtransKeyInput}
                        onChange={(e) => setMidtransKeyInput(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: 8, border: `1px solid ${tokens.cardBorder}` }}
                      />
                    </label>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: tokens.muted }}>
                      Kunci disimpan per tenant dan ditampilkan ter-mask. Untuk dev global, set env{' '}
                      <code>MIDTRANS_SERVER_KEY</code> di server API.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={testingMidtrans}
                        onClick={() => {
                          setTestingMidtrans(true);
                          setMidtransTestMessage(null);
                          void testMidtransConnection()
                            .then((result) => {
                              setMidtransTestMessage(result.message);
                            })
                            .catch((err: unknown) => {
                              setMidtransTestMessage(
                                err instanceof Error ? err.message : 'Uji koneksi Midtrans gagal.',
                              );
                            })
                            .finally(() => setTestingMidtrans(false));
                        }}
                      >
                        {testingMidtrans ? 'Menguji…' : 'Uji Koneksi Midtrans'}
                      </Button>
                      <Button type="submit" disabled={savingSettings}>
                        {savingSettings ? 'Menyimpan…' : 'Simpan Pengaturan Lanjutan'}
                      </Button>
                    </div>
                    {midtransTestMessage ? (
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: tokens.muted }}>{midtransTestMessage}</p>
                    ) : null}
                  </form>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.875rem', color: tokens.muted }}>
                    Hanya Pemilik yang dapat mengubah PPN dan kredensial Midtrans.
                  </p>
                )}
                {settingsMessage ? (
                  <p style={{ margin: '1rem 0 0', color: '#16a34a', fontSize: '0.875rem' }}>{settingsMessage}</p>
                ) : null}
              </>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
