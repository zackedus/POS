'use client';

import { useState } from 'react';
import { Button } from '@barokah/ui';
import { validateStorefrontPaymentSettings, type StorefrontSettings } from '@barokah/shared';
import { StatusBadge } from '@/components/dashboard/dashboard-ui';
import { inputStyle, SettingsFieldGrid, SettingsFieldRow } from '@/components/dashboard/settings/settings-ui';
import {
  midtransModeLabel,
  midtransStatusLabel,
  type MidtransConfigView,
} from '@/lib/settings-api';

function sectionHeading(title: string, description?: string) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <h3 style={{ margin: 0, fontSize: '1rem' }}>{title}</h3>
      {description ? (
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>{description}</p>
      ) : null}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem',
        fontSize: '0.875rem',
        minHeight: 44,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 3 }}
      />
      <span>
        <span style={{ fontWeight: 600 }}>{label}</span>
        {hint ? (
          <span style={{ display: 'block', marginTop: 2, fontSize: '0.8125rem', color: '#64748b' }}>{hint}</span>
        ) : null}
      </span>
    </label>
  );
}

function MaskedKeyInput({
  label,
  placeholder,
  value,
  onChange,
  disabled,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
      {label}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', maxWidth: 480 }}>
        <input
          type={visible ? 'text' : 'password'}
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          style={{ ...inputStyle(), flex: 1, maxWidth: 'none' }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          style={{
            minHeight: 44,
            padding: '0 0.75rem',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: '#fff',
            fontSize: '0.8125rem',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {visible ? 'Sembunyikan' : 'Tampilkan'}
        </button>
      </div>
    </label>
  );
}

export function StorePaymentSettingsSection({
  draft,
  midtrans,
  isOwner,
  midtransProduction,
  serverKeyInput,
  clientKeyInput,
  testingMidtrans,
  testMessage,
  onPatchPayment,
  onPatchCheckout,
  onMidtransProductionChange,
  onServerKeyInputChange,
  onClientKeyInputChange,
  onTestMidtrans,
}: {
  draft: StorefrontSettings;
  midtrans: MidtransConfigView;
  isOwner: boolean;
  midtransProduction: boolean;
  serverKeyInput: string;
  clientKeyInput: string;
  testingMidtrans: boolean;
  testMessage: string | null;
  onPatchPayment: (patch: Partial<StorefrontSettings['payment']>) => void;
  onPatchCheckout: (patch: Partial<StorefrontSettings['checkout']>) => void;
  onMidtransProductionChange: (value: boolean) => void;
  onServerKeyInputChange: (value: string) => void;
  onClientKeyInputChange: (value: string) => void;
  onTestMidtrans: () => Promise<void>;
}) {
  const status = midtransStatusLabel(midtrans);
  const validation = validateStorefrontPaymentSettings(draft, midtrans.serverKeyConfigured);

  async function copyWebhookUrl() {
    try {
      await navigator.clipboard.writeText(midtrans.webhookUrl);
    } catch {
      // ignore clipboard errors
    }
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div>
        {sectionHeading(
          'Integrasi Midtrans',
          'Kunci gateway untuk checkout online webstore. Server key wajib; client key opsional untuk Snap client-side.',
        )}
        <SettingsFieldGrid>
          <SettingsFieldRow label="Status">
            <StatusBadge label={status.label} variant={status.variant} />
          </SettingsFieldRow>
          <SettingsFieldRow label="Mode aktif">
            <strong>{midtransModeLabel(midtrans.mode)}</strong>
            <span style={{ marginLeft: 8, fontSize: '0.8125rem', color: '#64748b' }}>
              (sumber server key: {midtrans.keySource})
            </span>
          </SettingsFieldRow>
          <SettingsFieldRow label="Server key tersimpan">
            <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
              {midtrans.serverKeyMasked ?? '— belum dikonfigurasi —'}
            </span>
          </SettingsFieldRow>
          <SettingsFieldRow label="Client key tersimpan">
            <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
              {midtrans.clientKeyMasked ?? '— belum dikonfigurasi —'}
            </span>
          </SettingsFieldRow>
          <SettingsFieldRow
            label="Webhook URL"
            hint="Salin URL ini ke Dashboard Midtrans → Settings → Configuration → Payment Notification URL."
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{midtrans.webhookUrl}</code>
              <Button type="button" variant="secondary" onClick={() => void copyWebhookUrl()}>
                Salin
              </Button>
            </div>
          </SettingsFieldRow>
        </SettingsFieldGrid>

        {isOwner ? (
          <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 520, marginTop: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', minHeight: 44 }}>
              <input
                type="checkbox"
                checked={midtransProduction}
                onChange={(e) => onMidtransProductionChange(e.target.checked)}
              />
              Mode produksi Midtrans (live)
            </label>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
              Kunci dengan prefix <code>SB-</code> otomatis dianggap sandbox meskipun toggle live aktif.
            </p>
            <MaskedKeyInput
              label="Server Key (simpan baru)"
              placeholder="SB-Mid-server-… atau Mid-server-…"
              value={serverKeyInput}
              onChange={onServerKeyInputChange}
            />
            <MaskedKeyInput
              label="Client Key (opsional)"
              placeholder="SB-Mid-client-… atau Mid-client-…"
              value={clientKeyInput}
              onChange={onClientKeyInputChange}
            />
            {midtrans.productionGuardrails?.warnings.length ? (
              <div style={{ fontSize: '0.8125rem', color: '#b45309' }}>
                <strong>Perhatian:</strong>
                <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
                  {midtrans.productionGuardrails.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <Button type="button" variant="secondary" disabled={testingMidtrans} onClick={() => void onTestMidtrans()}>
                {testingMidtrans ? 'Menguji…' : 'Uji Koneksi'}
              </Button>
            </div>
            {testMessage ? (
              <p style={{ margin: 0, fontSize: '0.8125rem', color: testMessage.includes('OK') ? '#15803d' : '#b45309' }}>
                {testMessage}
              </p>
            ) : null}
          </div>
        ) : (
          <p style={{ margin: '1rem 0 0', fontSize: '0.875rem', color: '#64748b' }}>
            Hanya Pemilik yang dapat mengubah kredensial Midtrans.
          </p>
        )}
      </div>

      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
        {sectionHeading(
          'Metode pembayaran webstore',
          'Mengontrol opsi yang muncul di halaman checkout pelanggan.',
        )}
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          <ToggleRow
            label="Bayar penuh online (Midtrans)"
            hint="Pelanggan membayar 100% via Snap (transfer, QRIS, e-wallet). Wajib untuk pickup; tersedia juga untuk delivery."
            checked={draft.payment.onlinePaymentEnabled}
            onChange={(v) => onPatchPayment({ onlinePaymentEnabled: v })}
          />
          <ToggleRow
            label="COD — uang muka 20% (hanya delivery)"
            hint="Pelanggan bayar 20% online, sisanya 80% saat barang diterima. Hanya muncul jika pengiriman ke alamat aktif."
            checked={draft.payment.codEnabled}
            disabled={!draft.branches.deliveryEnabled}
            onChange={(v) => onPatchPayment({ codEnabled: v })}
          />
          <ToggleRow
            label="Transfer manual"
            hint="Fitur transfer manual ke rekening toko — segera hadir."
            checked={false}
            disabled
            onChange={() => undefined}
          />
          <StatusBadge label="Segera" variant="warning" />
        </div>
      </div>

      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
        {sectionHeading('Instruksi pembayaran', 'Ditampilkan di halaman checkout jika diisi.')}
        <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
          Teks instruksi (opsional)
          <textarea
            value={draft.checkout.paymentInstructions}
            onChange={(e) => onPatchCheckout({ paymentInstructions: e.target.value })}
            rows={4}
            maxLength={1000}
            placeholder="Contoh: Setelah checkout, Anda akan diarahkan ke halaman pembayaran Midtrans."
            style={{ ...inputStyle(), maxWidth: 'none', resize: 'vertical' }}
          />
        </label>
      </div>

      {validation.errors.length > 0 ? (
        <div style={{ padding: '0.75rem', borderRadius: 8, background: '#fef2f2', color: '#b91c1c', fontSize: '0.8125rem' }}>
          <strong>Perlu diperbaiki:</strong>
          <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
            {validation.errors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {validation.warnings.length > 0 ? (
        <div style={{ padding: '0.75rem', borderRadius: 8, background: '#fffbeb', color: '#92400e', fontSize: '0.8125rem' }}>
          <strong>Peringatan:</strong>
          <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
            {validation.warnings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
