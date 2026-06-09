'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@barokah/ui';
import { formatCurrency, type StorefrontSettings } from '@barokah/shared';
import {
  AlertBanner,
  cardStyle,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  StatusBadge,
} from '@/components/dashboard/dashboard-ui';
import { inputStyle, SettingsFieldRow } from '@/components/dashboard/settings/settings-ui';
import { fetchMe } from '@/lib/auth';
import { mapApiError } from '@/lib/api-client';
import {
  fetchStorefrontSettings,
  fetchTenantProfile,
  midtransModeLabel,
  updateStorefrontSettings,
  updateTenantProfile,
  type StorefrontSettingsView,
  type TenantProfileView,
} from '@/lib/settings-api';

const PROFILE_QUERY_KEY = ['tenant-profile'] as const;
const STOREFRONT_QUERY_KEY = ['tenant-storefront'] as const;

type TabId =
  | 'identity'
  | 'appearance'
  | 'catalog'
  | 'branches'
  | 'checkout'
  | 'payment'
  | 'seo'
  | 'operations';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'identity', label: 'Identitas Toko' },
  { id: 'appearance', label: 'Tampilan Web' },
  { id: 'catalog', label: 'Katalog Online' },
  { id: 'branches', label: 'Cabang & Pengiriman' },
  { id: 'checkout', label: 'Checkout' },
  { id: 'payment', label: 'Pembayaran' },
  { id: 'seo', label: 'SEO & Domain' },
  { id: 'operations', label: 'Operasional' },
];

function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: '0.5rem 0.75rem',
    borderRadius: 8,
    border: `1px solid ${active ? '#2563eb' : '#e2e8f0'}`,
    background: active ? '#eff6ff' : '#fff',
    color: active ? '#1d4ed8' : '#334155',
    fontWeight: 600,
    fontSize: '0.8125rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
}

export default function StoreProfileClient() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>('identity');
  const [canEditName, setCanEditName] = useState(false);
  const [name, setName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [settingsDraft, setSettingsDraft] = useState<StorefrontSettings | null>(null);
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);

  const profileQuery = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      const [me, profile] = await Promise.all([fetchMe(), fetchTenantProfile()]);
      setCanEditName(me.role === 'OWNER');
      setName(profile.name);
      setContactPhone(profile.contactPhone ?? '');
      setWhatsapp(profile.whatsapp ?? '');
      setDescription(profile.description ?? '');
      setLogoUrl(profile.logoUrl ?? '');
      return profile;
    },
  });

  const storefrontQuery = useQuery({
    queryKey: STOREFRONT_QUERY_KEY,
    queryFn: async () => {
      const data = await fetchStorefrontSettings();
      setSettingsDraft(data.settings);
      return data;
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: () =>
      updateTenantProfile({
        ...(canEditName ? { name: name.trim() } : {}),
        contactPhone: contactPhone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        description: description.trim() || null,
        logoUrl: logoUrl.trim() || null,
      }),
    onSuccess: (data: TenantProfileView) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, data);
      setToast({ variant: 'success', message: 'Identitas toko berhasil disimpan.' });
    },
    onError: (err) => {
      setToast({ variant: 'error', message: mapApiError(err, 'Gagal menyimpan identitas toko.') });
    },
  });

  const saveStorefrontMutation = useMutation({
    mutationFn: () => updateStorefrontSettings(settingsDraft ?? {}),
    onSuccess: (data: StorefrontSettingsView) => {
      queryClient.setQueryData(STOREFRONT_QUERY_KEY, data);
      setSettingsDraft(data.settings);
      setToast({ variant: 'success', message: 'Pengaturan storefront berhasil disimpan.' });
    },
    onError: (err) => {
      setToast({ variant: 'error', message: mapApiError(err, 'Gagal menyimpan pengaturan storefront.') });
    },
  });

  const profile = profileQuery.data;
  const storefront = storefrontQuery.data;
  const storefrontUrl = profile ? `/store/${profile.slug}` : null;

  const draft = settingsDraft ?? storefront?.settings;

  function patchSettings(patch: Partial<StorefrontSettings>) {
    if (!draft) return;
    setSettingsDraft({ ...draft, ...patch });
  }

  function patchNested<K extends 'appearance' | 'catalog' | 'branches' | 'checkout' | 'payment' | 'seo' | 'operations'>(
    key: K,
    patch: Partial<StorefrontSettings[K]>,
  ) {
    if (!draft) return;
    setSettingsDraft({ ...draft, [key]: { ...draft[key], ...patch } });
  }

  function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    saveProfileMutation.mutate();
  }

  function handleStorefrontSubmit(e: FormEvent) {
    e.preventDefault();
    saveStorefrontMutation.mutate();
  }

  const loading = profileQuery.isLoading || storefrontQuery.isLoading;

  return (
    <div style={{ maxWidth: 920, display: 'grid', gap: '1.25rem' }}>
      <PageHeader
        title="Profil Toko"
        description="Semua pengaturan web storefront dikelola di sini — identitas, tampilan, katalog, cabang, checkout, pembayaran, SEO, dan operasional."
        actions={
          <Link href="/dashboard/settings" style={{ fontSize: '0.875rem', color: '#2563eb' }}>
            ← Pengaturan Aplikasi
          </Link>
        }
      />

      {toast ? <AlertBanner variant={toast.variant}>{toast.message}</AlertBanner> : null}

      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: 4 }}>
        {TABS.map((item) => (
          <button key={item.id} type="button" style={tabButtonStyle(tab === item.id)} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : profile && draft && storefront ? (
        <>
          {tab === 'identity' ? (
            <section style={cardStyle()}>
              <form onSubmit={(e) => void handleProfileSubmit(e)} style={{ display: 'grid', gap: '0.85rem', maxWidth: 560 }}>
                <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Nama toko
                  <input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEditName || saveProfileMutation.isPending} maxLength={120} style={inputStyle()} />
                </label>
                <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Slug URL storefront
                  <input value={profile.slug} readOnly disabled style={{ ...inputStyle(), fontFamily: 'monospace' }} />
                </label>
                <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Deskripsi toko
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1000} style={{ ...inputStyle(), resize: 'vertical' }} />
                </label>
                <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Telepon kontak
                  <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="021-5551234" maxLength={20} style={inputStyle()} />
                </label>
                <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
                  WhatsApp
                  <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="0812xxxxxxxx" maxLength={20} style={inputStyle()} />
                </label>
                <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
                  URL logo
                  <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://cdn.example.com/logo.png" maxLength={500} style={inputStyle()} />
                </label>
                {logoUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div role="img" aria-label="Pratinjau logo" style={{ width: 48, height: 48, borderRadius: 8, border: '1px solid #e2e8f0', background: `center / contain no-repeat url(${logoUrl})` }} />
                    <StatusBadge label="Pratinjau logo" variant="neutral" />
                  </div>
                ) : null}
                <SaveActions loading={saveProfileMutation.isPending} storefrontUrl={storefrontUrl} />
              </form>
            </section>
          ) : null}

          {tab !== 'identity' ? (
            <section style={cardStyle()}>
              <form onSubmit={(e) => void handleStorefrontSubmit(e)} style={{ display: 'grid', gap: '0.85rem', maxWidth: 560 }}>
                {tab === 'appearance' ? (
                  <>
                    <Field label="Judul hero" value={draft.appearance.heroTitle} onChange={(v) => patchNested('appearance', { heroTitle: v })} />
                    <Field label="Subjudul hero" value={draft.appearance.heroSubtitle} onChange={(v) => patchNested('appearance', { heroSubtitle: v })} multiline />
                    <Field label="URL gambar hero" value={draft.appearance.heroImageUrl ?? ''} onChange={(v) => patchNested('appearance', { heroImageUrl: v || null })} />
                    <Field label="Warna accent (hex)" value={draft.appearance.accentColor} onChange={(v) => patchNested('appearance', { accentColor: v })} />
                    <Field label="Tagline" value={draft.appearance.tagline} onChange={(v) => patchNested('appearance', { tagline: v })} />
                    <Field label="Teks banner promo" value={draft.appearance.promoBannerText ?? ''} onChange={(v) => patchNested('appearance', { promoBannerText: v || null })} />
                    <Field label="Footer" value={draft.appearance.footerText} onChange={(v) => patchNested('appearance', { footerText: v })} multiline />
                  </>
                ) : null}

                {tab === 'catalog' ? (
                  <>
                    <Toggle label="Storefront aktif" checked={draft.enabled} onChange={(v) => patchSettings({ enabled: v })} />
                    <Toggle label="Tampilkan produk habis" checked={draft.catalog.showOutOfStock} onChange={(v) => patchNested('catalog', { showOutOfStock: v })} />
                    <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Urutan default katalog
                      <select value={draft.catalog.defaultSort} onChange={(e) => patchNested('catalog', { defaultSort: e.target.value as StorefrontSettings['catalog']['defaultSort'] })} style={inputStyle()}>
                        <option value="name_asc">Nama A→Z</option>
                        <option value="name_desc">Nama Z→A</option>
                        <option value="price_asc">Harga terendah</option>
                        <option value="price_desc">Harga tertinggi</option>
                      </select>
                    </label>
                    <Field label="ID kategori featured (UUID, pisah koma)" value={draft.catalog.featuredCategoryIds.join(', ')} onChange={(v) => patchNested('catalog', { featuredCategoryIds: v.split(',').map((s) => s.trim()).filter(Boolean) })} hint="Kosongkan untuk otomatis 6 kategori pertama." />
                  </>
                ) : null}

                {tab === 'branches' ? (
                  <>
                    <Toggle label="Pickup di toko" checked={draft.branches.pickupEnabled} onChange={(v) => patchNested('branches', { pickupEnabled: v })} />
                    <Toggle label="Antar ke alamat" checked={draft.branches.deliveryEnabled} onChange={(v) => patchNested('branches', { deliveryEnabled: v })} />
                    <Field label="Radius pengiriman (km, kosong = tanpa batas)" value={draft.branches.deliveryRadiusKm?.toString() ?? ''} onChange={(v) => patchNested('branches', { deliveryRadiusKm: v.trim() ? Number(v) : null })} />
                    <Field label="Catatan pengiriman" value={draft.branches.deliveryNotes} onChange={(v) => patchNested('branches', { deliveryNotes: v })} multiline />
                    <Field label="ID cabang aktif di picker (UUID, pisah koma)" value={draft.branches.enabledOutletIds.join(', ')} onChange={(v) => patchNested('branches', { enabledOutletIds: v.split(',').map((s) => s.trim()).filter(Boolean) })} hint="Kosongkan = semua cabang aktif tenant." />
                  </>
                ) : null}

                {tab === 'checkout' ? (
                  <>
                    <Field label="Minimum order (Rp)" value={String(draft.checkout.minOrderAmount)} onChange={(v) => patchNested('checkout', { minOrderAmount: Number(v.replace(/\D/g, '')) || 0 })} />
                    <Field label="Instruksi pembayaran" value={draft.checkout.paymentInstructions} onChange={(v) => patchNested('checkout', { paymentInstructions: v })} multiline />
                    <Toggle label="Wajib isi nama" checked={draft.checkout.requireName} onChange={(v) => patchNested('checkout', { requireName: v })} />
                    <Toggle label="Wajib isi HP" checked={draft.checkout.requirePhone} onChange={(v) => patchNested('checkout', { requirePhone: v })} />
                    <Toggle label="Wajib isi alamat (delivery)" checked={draft.checkout.requireAddress} onChange={(v) => patchNested('checkout', { requireAddress: v })} />
                    <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>Min. order saat ini: {formatCurrency(draft.checkout.minOrderAmount)}</p>
                  </>
                ) : null}

                {tab === 'payment' ? (
                  <>
                    <SettingsFieldRow label="Mode Midtrans saat ini">
                      <strong>{midtransModeLabel(storefront.midtrans.mode)}</strong>
                    </SettingsFieldRow>
                    <Toggle label="Pembayaran online (Midtrans)" checked={draft.payment.onlinePaymentEnabled} onChange={(v) => patchNested('payment', { onlinePaymentEnabled: v })} />
                    <Toggle label="Transfer manual (defer UI checkout)" checked={draft.payment.manualTransferEnabled} onChange={(v) => patchNested('payment', { manualTransferEnabled: v })} />
                    <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>Konfigurasi server key Midtrans tetap di tab Pembayaran Pengaturan Aplikasi.</p>
                  </>
                ) : null}

                {tab === 'seo' ? (
                  <>
                    <Field label="Meta title" value={draft.seo.metaTitle} onChange={(v) => patchNested('seo', { metaTitle: v })} />
                    <Field label="Meta description" value={draft.seo.metaDescription} onChange={(v) => patchNested('seo', { metaDescription: v })} multiline />
                    <SettingsFieldRow label="Pratinjau URL">
                      {storefrontUrl ? (
                        <Link href={storefrontUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
                          {storefrontUrl}
                        </Link>
                      ) : '—'}
                    </SettingsFieldRow>
                  </>
                ) : null}

                {tab === 'operations' ? (
                  <>
                    <Field label="Jam buka order online (HH:MM)" value={draft.operations.onlineOrderHoursStart} onChange={(v) => patchNested('operations', { onlineOrderHoursStart: v })} />
                    <Field label="Jam tutup order online (HH:MM)" value={draft.operations.onlineOrderHoursEnd} onChange={(v) => patchNested('operations', { onlineOrderHoursEnd: v })} />
                    <Toggle label="Tutup sementara" checked={draft.operations.temporarilyClosed} onChange={(v) => patchNested('operations', { temporarilyClosed: v })} />
                    <Field label="Pesan saat tutup" value={draft.operations.closedMessage} onChange={(v) => patchNested('operations', { closedMessage: v })} multiline />
                  </>
                ) : null}

                <SaveActions loading={saveStorefrontMutation.isPending} storefrontUrl={storefrontUrl} />
              </form>
            </section>
          ) : null}
        </>
      ) : (
        <EmptyState title="Profil tidak tersedia" description="Gagal memuat profil atau pengaturan storefront." />
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  hint?: string;
}) {
  return (
    <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
      {label}
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} style={{ ...inputStyle(), resize: 'vertical' }} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle()} />
      )}
      {hint ? <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{hint}</span> : null}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function SaveActions({ loading, storefrontUrl }: { loading: boolean; storefrontUrl: string | null }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <Button type="submit" variant="primary" disabled={loading}>
        {loading ? 'Menyimpan…' : 'Simpan'}
      </Button>
      {storefrontUrl ? (
        <Link href={storefrontUrl} target="_blank" rel="noopener noreferrer">
          <Button type="button" variant="secondary">
            Buka Storefront
          </Button>
        </Link>
      ) : null}
    </div>
  );
}
