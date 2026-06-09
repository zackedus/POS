'use client';

import Link from 'next/link';
import { Button } from '@barokah/ui';
import {
  CREDIT_TERMS_DAYS_OPTIONS,
  ONLINE_DELIVERY_FLAT_FEE,
  ONLINE_PAYMENT_TTL_MINUTES,
  POS_HOLD_TTL_MINUTES,
  POS_PAYMENT_METHODS,
} from '@barokah/shared';
import { SectionCard, StatusBadge } from '@/components/dashboard/dashboard-ui';
import type { AuthUser } from '@/lib/auth';
import type { ReportOutlet } from '@/lib/reports';
import {
  midtransModeLabel,
  type TenantSettingsView,
} from '@/lib/settings-api';
import type { PromoRuleView } from '@/lib/promotions-api';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import {
  SettingsFieldGrid,
  SettingsFieldRow,
  formatIdr,
  inputStyle,
  roleLabel,
} from './settings-ui';

function ReadOnlyBadge({ defer }: { defer?: boolean }) {
  if (defer) {
    return <StatusBadge label="Defer Fase 2+" variant="warning" />;
  }
  return <StatusBadge label="Hanya baca" variant="neutral" />;
}

export function TokoTenantSection({
  user,
  settings,
  canEdit,
  ppnEnabled,
  ppnRate,
  onPpnEnabledChange,
  onPpnRateChange,
  onSave,
  saving,
}: {
  user: AuthUser | null;
  settings: TenantSettingsView | null;
  canEdit: boolean;
  ppnEnabled: boolean;
  ppnRate: string;
  onPpnEnabledChange: (value: boolean) => void;
  onPpnRateChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const storefrontSlug = user?.tenantSlug;
  const storefrontUrl = storefrontSlug ? `/store/${storefrontSlug}` : null;

  return (
    <SectionCard title="Toko & Tenant" description="Profil tenant dan konfigurasi PPN toko.">
      <SettingsFieldGrid>
        <SettingsFieldRow label="Nama toko">
          <strong>{user?.tenantName ?? '—'}</strong>
          <ReadOnlyBadge />
        </SettingsFieldRow>
        <SettingsFieldRow label="Slug storefront" hint="Slug diatur saat provisioning tenant.">
          <span style={{ fontFamily: 'monospace' }}>{storefrontSlug ?? '—'}</span>{' '}
          <ReadOnlyBadge />
        </SettingsFieldRow>
        <SettingsFieldRow label="Timezone" hint="Timezone tenant belum dapat diubah di MVP.">
          <span>Asia/Jakarta (WIB)</span>{' '}
          <ReadOnlyBadge />
        </SettingsFieldRow>
        <SettingsFieldRow label="Akun Anda">
          {user ? `${user.fullName} · ${user.email} · ${roleLabel(user.role)}` : '—'}
        </SettingsFieldRow>
      </SettingsFieldGrid>

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
            Buka Storefront
          </Link>
          <Link
            href="/dashboard/store"
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
            Kelola Profil Toko →
          </Link>
        </div>
      ) : null}

      <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
        <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>PPN (Pajak Pertambahan Nilai)</h4>
        {canEdit ? (
          <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 420 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9375rem', minHeight: 44 }}>
              <input type="checkbox" checked={ppnEnabled} onChange={(e) => onPpnEnabledChange(e.target.checked)} />
              Aktifkan PPN pada transaksi kasir
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
              Tarif PPN (%)
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={ppnRate}
                onChange={(e) => onPpnRateChange(e.target.value)}
                style={inputStyle()}
              />
            </label>
            <Button type="button" onClick={onSave} disabled={saving}>
              {saving ? 'Menyimpan…' : 'Simpan PPN'}
            </Button>
          </div>
        ) : (
          <SettingsFieldGrid>
            <SettingsFieldRow label="Status PPN">
              {settings?.ppnEnabled ? `Aktif (${settings.ppnRatePercent}%)` : 'Nonaktif'}
            </SettingsFieldRow>
          </SettingsFieldGrid>
        )}
      </div>
    </SectionCard>
  );
}

export function KasirPosSection({
  settings,
  canEdit,
  defaultCreditTermsDays,
  onDefaultCreditTermsDaysChange,
  onSaveCreditTerms,
  saving,
}: {
  settings: TenantSettingsView | null;
  canEdit: boolean;
  defaultCreditTermsDays: number;
  onDefaultCreditTermsDaysChange: (value: number) => void;
  onSaveCreditTerms: () => void;
  saving: boolean;
}) {
  return (
    <SectionCard
      title="Kasir & POS"
      description="Parameter operasional kasir. Beberapa item masih hardcoded di MVP."
    >
      <SettingsFieldGrid>
        <SettingsFieldRow label="Hold TTL" hint="Transaksi hold otomatis kedaluwarsa setelah durasi ini.">
          <strong>{POS_HOLD_TTL_MINUTES} menit</strong>
          <ReadOnlyBadge />
        </SettingsFieldRow>
        <SettingsFieldRow label="Header struk">
          <span>Nama tenant + outlet (otomatis)</span>
          <ReadOnlyBadge defer />
        </SettingsFieldRow>
        <SettingsFieldRow label="Footer struk">
          <span>Terima kasih — teks default sistem</span>
          <ReadOnlyBadge defer />
        </SettingsFieldRow>
      </SettingsFieldGrid>

      <div style={{ marginTop: '1.25rem' }}>
        <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Metode pembayaran default kasir</h4>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {POS_PAYMENT_METHODS.map((method) => (
            <div
              key={method.code}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.65rem 0.75rem',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                fontSize: '0.875rem',
              }}
            >
              <span>{method.label}</span>
              {method.enabled ? (
                <StatusBadge label="Aktif" variant="success" />
              ) : method.defer ? (
                <StatusBadge label="Defer" variant="warning" />
              ) : (
                <StatusBadge label="Nonaktif" variant="neutral" />
              )}
            </div>
          ))}
        </div>
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
          Konfigurasi per-metode di dashboard akan tersedia setelah integrasi gateway live (Arif).
        </p>
      </div>

      <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
        <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Jatuh tempo piutang (Tempo)</h4>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: '#64748b' }}>
          Default jatuh tempo saat checkout tempo di kasir. Kasir dapat override per transaksi (7/14/30 hari).
        </p>
        {canEdit ? (
          <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 320 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
              Jatuh tempo default
              <select
                value={defaultCreditTermsDays}
                onChange={(e) => onDefaultCreditTermsDaysChange(Number(e.target.value))}
                style={inputStyle()}
              >
                {CREDIT_TERMS_DAYS_OPTIONS.map((days) => (
                  <option key={days} value={days}>
                    {days} hari
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" onClick={onSaveCreditTerms} disabled={saving}>
              {saving ? 'Menyimpan…' : 'Simpan jatuh tempo'}
            </Button>
          </div>
        ) : (
          <SettingsFieldGrid>
            <SettingsFieldRow label="Jatuh tempo default">
              {settings?.defaultCreditTermsDays ?? 30} hari
            </SettingsFieldRow>
          </SettingsFieldGrid>
        )}
      </div>
    </SectionCard>
  );
}

export function LoyaltySection({
  settings,
  canEdit,
  loyaltyEnabled,
  earnRate,
  redeemEnabled,
  redeemValue,
  redeemMaxPercent,
  onLoyaltyEnabledChange,
  onEarnRateChange,
  onRedeemEnabledChange,
  onRedeemValueChange,
  onRedeemMaxPercentChange,
  onSave,
  saving,
}: {
  settings: TenantSettingsView | null;
  canEdit: boolean;
  loyaltyEnabled: boolean;
  earnRate: string;
  redeemEnabled: boolean;
  redeemValue: string;
  redeemMaxPercent: string;
  onLoyaltyEnabledChange: (value: boolean) => void;
  onEarnRateChange: (value: string) => void;
  onRedeemEnabledChange: (value: boolean) => void;
  onRedeemValueChange: (value: string) => void;
  onRedeemMaxPercentChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <SectionCard title="Loyalty" description="Atur perolehan dan penukaran poin pelanggan.">
      {canEdit ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
          style={{ display: 'grid', gap: '0.75rem', maxWidth: 420 }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9375rem', minHeight: 44 }}>
            <input
              type="checkbox"
              checked={loyaltyEnabled}
              onChange={(e) => onLoyaltyEnabledChange(e.target.checked)}
            />
            Aktifkan program poin loyalty
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
            Earn rate — 1 poin per belanja (Rp)
            <input
              type="number"
              min={1000}
              step={1000}
              value={earnRate}
              onChange={(e) => onEarnRateChange(e.target.value)}
              style={inputStyle()}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9375rem', minHeight: 44 }}>
            <input
              type="checkbox"
              checked={redeemEnabled}
              onChange={(e) => onRedeemEnabledChange(e.target.checked)}
            />
            Izinkan tukar poin di kasir
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
            Redeem rate — nilai 1 poin (Rp)
            <input
              type="number"
              min={100}
              step={100}
              value={redeemValue}
              onChange={(e) => onRedeemValueChange(e.target.value)}
              style={inputStyle()}
            />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
            Maksimum redeem (% dari total)
            <input
              type="number"
              min={1}
              max={100}
              value={redeemMaxPercent}
              onChange={(e) => onRedeemMaxPercentChange(e.target.value)}
              style={inputStyle()}
            />
          </label>
          <Button type="submit" disabled={saving}>
            {saving ? 'Menyimpan…' : 'Simpan Loyalty'}
          </Button>
        </form>
      ) : (
        <SettingsFieldGrid>
          <SettingsFieldRow label="Program poin">
            {settings?.loyaltyPointsEnabled ? 'Aktif' : 'Nonaktif'}
          </SettingsFieldRow>
          <SettingsFieldRow label="Earn rate">
            1 poin / {formatIdr(settings?.loyaltyEarnRateIdr ?? 10_000)}
          </SettingsFieldRow>
          <SettingsFieldRow label="Redeem">
            {settings?.loyaltyRedeemEnabled ? 'Aktif' : 'Nonaktif'} — 1 poin ={' '}
            {formatIdr(settings?.loyaltyRedeemValueIdr ?? 1_000)}, maks{' '}
            {settings?.loyaltyRedeemMaxPercent ?? 50}%
          </SettingsFieldRow>
        </SettingsFieldGrid>
      )}
    </SectionCard>
  );
}

function promoStatusLabel(promo: PromoRuleView): 'success' | 'warning' | 'neutral' {
  const now = Date.now();
  if (!promo.isActive) return 'neutral';
  if (promo.startsAt && new Date(promo.startsAt).getTime() > now) return 'warning';
  if (promo.endsAt && new Date(promo.endsAt).getTime() < now) return 'neutral';
  return 'success';
}

function promoStatusText(promo: PromoRuleView): string {
  const now = Date.now();
  if (!promo.isActive) return 'Nonaktif';
  if (promo.startsAt && new Date(promo.startsAt).getTime() > now) return 'Terjadwal';
  if (promo.endsAt && new Date(promo.endsAt).getTime() < now) return 'Kedaluwarsa';
  return 'Aktif';
}

export function PromoSection({ promos, loading }: { promos: PromoRuleView[]; loading: boolean }) {
  const activeCount = promos.filter((p) => promoStatusText(p) === 'Aktif').length;

  return (
    <SectionCard
      title="Promo"
      description="Aturan promo dikelola di halaman terpisah. Ringkasan di bawah untuk referensi cepat."
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
        <StatusBadge label={`${activeCount} promo aktif`} variant={activeCount > 0 ? 'success' : 'neutral'} />
        <Link
          href="/dashboard/promotions"
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
          Kelola Promo & Diskon →
        </Link>
      </div>

      {loading ? (
        <p style={{ margin: 0, color: '#64748b' }}>Memuat promo…</p>
      ) : promos.length === 0 ? (
        <p style={{ margin: 0, color: '#64748b' }}>Belum ada aturan promo. Buat promo pertama di halaman kelola promo.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Nama</th>
                <th style={{ padding: '0.5rem' }}>Tipe</th>
                <th style={{ padding: '0.5rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {promos.slice(0, 8).map((promo) => (
                <tr key={promo.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.65rem 0.5rem' }}>{promo.name}</td>
                  <td style={{ padding: '0.65rem 0.5rem', color: '#64748b' }}>
                    {promo.type === 'PERCENTAGE' ? `${promo.value}%` : formatIdr(promo.value)}
                  </td>
                  <td style={{ padding: '0.65rem 0.5rem' }}>
                    <StatusBadge label={promoStatusText(promo)} variant={promoStatusLabel(promo)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {promos.length > 8 ? (
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
              +{promos.length - 8} promo lainnya — lihat halaman kelola promo.
            </p>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

export function PembayaranSection({
  settings,
  isOwner,
  canEditMidtrans,
  midtransProduction,
  midtransKeyInput,
  weeklyReportEmail,
  onMidtransProductionChange,
  onMidtransKeyInputChange,
  onWeeklyReportEmailChange,
  onSaveMidtrans,
  onTestMidtrans,
  saving,
  testing,
  testMessage,
}: {
  settings: TenantSettingsView | null;
  isOwner: boolean;
  canEditMidtrans: boolean;
  midtransProduction: boolean;
  midtransKeyInput: string;
  weeklyReportEmail: boolean;
  onMidtransProductionChange: (value: boolean) => void;
  onMidtransKeyInputChange: (value: string) => void;
  onWeeklyReportEmailChange: (value: boolean) => void;
  onSaveMidtrans: () => void;
  onTestMidtrans: () => Promise<void>;
  saving: boolean;
  testing: boolean;
  testMessage: string | null;
}) {
  const { tokens } = useAdminTheme();

  return (
    <SectionCard title="Pembayaran" description="Gateway online (Midtrans) dan metode pembayaran kasir.">
      <SettingsFieldGrid>
        <SettingsFieldRow label="Tunai">
          <StatusBadge label="Aktif" variant="success" />
        </SettingsFieldRow>
        <SettingsFieldRow label="Transfer manual">
          <StatusBadge label="Aktif" variant="success" />
        </SettingsFieldRow>
        <SettingsFieldRow label="QRIS kasir" hint="QRIS live membutuhkan key produksi + hardware (defer).">
          <StatusBadge label="Mock / Sandbox" variant="info" />
        </SettingsFieldRow>
        <SettingsFieldRow label="E-Wallet / EDC">
          <StatusBadge label="Defer" variant="warning" />
        </SettingsFieldRow>
      </SettingsFieldGrid>

      <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
        <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Midtrans (Checkout Online)</h4>
        {settings ? (
          <>
            <SettingsFieldGrid>
              <SettingsFieldRow label="Mode">
                <strong>{midtransModeLabel(settings.midtrans.mode)}</strong>
                <span style={{ marginLeft: 8, fontSize: '0.8125rem', color: tokens.muted }}>
                  (sumber kunci: {settings.midtrans.keySource})
                </span>
              </SettingsFieldRow>
              <SettingsFieldRow label="Server Key">
                <span style={{ fontFamily: 'monospace' }}>
                  {settings.midtrans.serverKeyMasked ?? '— belum dikonfigurasi —'}
                </span>
              </SettingsFieldRow>
              <SettingsFieldRow label="Webhook URL">
                <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{settings.midtrans.webhookPath}</span>
              </SettingsFieldRow>
            </SettingsFieldGrid>

            {canEditMidtrans ? (
              <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 480, marginTop: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', minHeight: 44 }}>
                  <input
                    type="checkbox"
                    checked={midtransProduction}
                    onChange={(e) => onMidtransProductionChange(e.target.checked)}
                  />
                  Mode produksi Midtrans (live)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', minHeight: 44 }}>
                  <input
                    type="checkbox"
                    checked={weeklyReportEmail}
                    onChange={(e) => onWeeklyReportEmailChange(e.target.checked)}
                  />
                  Kirim laporan analitik mingguan ke email pemilik
                </label>
                {settings.midtrans.productionGuardrails?.warnings.length ? (
                  <div style={{ fontSize: '0.8125rem', color: '#b45309' }}>
                    <strong>Checklist produksi Midtrans:</strong>
                    <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
                      {settings.midtrans.productionGuardrails.warnings.map((warning) => (
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
                    onChange={(e) => onMidtransKeyInputChange(e.target.value)}
                    style={inputStyle(tokens.cardBorder)}
                  />
                </label>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: tokens.muted }}>
                  Kunci disimpan per tenant dan ditampilkan ter-mask. Untuk dev global, set env{' '}
                  <code>MIDTRANS_SERVER_KEY</code> di server API.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                  <Button type="button" variant="secondary" disabled={testing} onClick={() => void onTestMidtrans()}>
                    {testing ? 'Menguji…' : 'Uji Koneksi Midtrans'}
                  </Button>
                  <Button type="button" disabled={saving} onClick={onSaveMidtrans}>
                    {saving ? 'Menyimpan…' : 'Simpan Midtrans'}
                  </Button>
                </div>
                {testMessage ? (
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: tokens.muted }}>{testMessage}</p>
                ) : null}
              </div>
            ) : (
              <p style={{ margin: '1rem 0 0', fontSize: '0.875rem', color: tokens.muted }}>
                {isOwner
                  ? 'Anda tidak memiliki izin mengubah Midtrans.'
                  : 'Hanya Pemilik yang dapat mengubah kredensial Midtrans dan laporan email.'}
              </p>
            )}
          </>
        ) : null}
      </div>
    </SectionCard>
  );
}

export function OnlineStorefrontSection({ user }: { user: AuthUser | null }) {
  const storefrontSlug = user?.tenantSlug;
  const storefrontUrl = storefrontSlug ? `/store/${storefrontSlug}` : null;

  return (
    <SectionCard title="Online / Storefront" description="Semua pengaturan storefront web dikelola di Profil Toko.">
      <SettingsFieldGrid>
        <SettingsFieldRow label="Pengaturan storefront" hint="Identitas, tampilan, katalog, cabang, checkout, pembayaran, SEO, operasional.">
          <Link href="/dashboard/store" style={{ color: '#2563eb', fontWeight: 600 }}>
            Buka Profil Toko →
          </Link>
        </SettingsFieldRow>
        <SettingsFieldRow label="Ongkir delivery (flat)">
          {formatIdr(ONLINE_DELIVERY_FLAT_FEE)}
          <ReadOnlyBadge />
        </SettingsFieldRow>
        <SettingsFieldRow label="Batas bayar order">
          {ONLINE_PAYMENT_TTL_MINUTES} menit
          <ReadOnlyBadge />
        </SettingsFieldRow>
        <SettingsFieldRow label="URL storefront">
          {storefrontUrl ? (
            <Link href={storefrontUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
              {storefrontUrl}
            </Link>
          ) : (
            '—'
          )}
        </SettingsFieldRow>
      </SettingsFieldGrid>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {storefrontUrl ? (
          <Link
            href={storefrontUrl}
            target="_blank"
            rel="noopener noreferrer"
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
            Preview Storefront
          </Link>
        ) : null}
        <Link
          href="/dashboard/store"
          style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            borderRadius: 8,
            background: '#2563eb',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          Kelola Profil Toko
        </Link>
        <Link
          href="/dashboard/online-orders"
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
          Kelola Pesanan Web →
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
          Antrian Kasir →
        </Link>
      </div>
    </SectionCard>
  );
}

export function OutletSection({
  outlets,
  selectedOutletId,
}: {
  outlets: ReportOutlet[];
  selectedOutletId: string | null;
}) {
  const selectedOutlet = outlets.find((o) => o.id === selectedOutletId) ?? outlets[0];

  return (
    <SectionCard title="Outlet / Cabang" description="Daftar cabang tenant dan cabang aktif di header dashboard.">
      {outlets.length === 0 ? (
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
              {outlets.map((outlet) => {
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
      <p style={{ margin: '1rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
        Pilih cabang aktif di header untuk modul stok, laporan, dan order distributor.{' '}
        <Link href="/dashboard/outlets" style={{ color: '#2563eb' }}>
          Kelola cabang →
        </Link>
      </p>
    </SectionCard>
  );
}