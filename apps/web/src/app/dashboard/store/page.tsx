'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@barokah/ui';
import {
  AlertBanner,
  cardStyle,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  StatusBadge,
} from '@/components/dashboard/dashboard-ui';
import { inputStyle } from '@/components/dashboard/settings/settings-ui';
import { fetchMe } from '@/lib/auth';
import { mapApiError } from '@/lib/api-client';
import {
  fetchTenantProfile,
  updateTenantProfile,
  type TenantProfileView,
} from '@/lib/settings-api';

const PROFILE_QUERY_KEY = ['tenant-profile'] as const;

export default function StoreProfilePage() {
  const queryClient = useQueryClient();
  const [canEditName, setCanEditName] = useState(false);
  const [name, setName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);

  const profileQuery = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      const [me, profile] = await Promise.all([fetchMe(), fetchTenantProfile()]);
      setCanEditName(me.role === 'OWNER');
      setName(profile.name);
      setContactPhone(profile.contactPhone ?? '');
      setLogoUrl(profile.logoUrl ?? '');
      return profile;
    },
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      updateTenantProfile({
        ...(canEditName ? { name: name.trim() } : {}),
        contactPhone: contactPhone.trim() || null,
        logoUrl: logoUrl.trim() || null,
      }),
    onSuccess: (data: TenantProfileView) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, data);
      setToast({ variant: 'success', message: 'Profil toko berhasil disimpan.' });
    },
    onError: (err) => {
      setToast({ variant: 'error', message: mapApiError(err, 'Gagal menyimpan profil toko.') });
    },
  });

  const profile = profileQuery.data;
  const storefrontUrl = profile ? `/store/${profile.slug}` : null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    saveMutation.mutate();
  }

  return (
    <div style={{ maxWidth: 720, display: 'grid', gap: '1.25rem' }}>
      <PageHeader
        title="Profil Toko"
        description="Identitas tenant untuk struk, storefront, dan komunikasi pelanggan."
        actions={
          <Link href="/dashboard/settings" style={{ fontSize: '0.875rem', color: '#2563eb' }}>
            ← Pengaturan Aplikasi
          </Link>
        }
      />

      {toast ? <AlertBanner variant={toast.variant}>{toast.message}</AlertBanner> : null}

      {profileQuery.isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : profile ? (
        <section style={cardStyle()}>
          <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: '0.85rem', maxWidth: 480 }}>
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              Nama toko
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEditName || saveMutation.isPending}
                maxLength={120}
                style={inputStyle()}
              />
              {!canEditName ? (
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Hanya pemilik yang dapat mengubah nama.</span>
              ) : null}
            </label>

            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              Slug storefront
              <input value={profile.slug} readOnly disabled style={{ ...inputStyle(), fontFamily: 'monospace' }} />
            </label>

            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              Telepon kontak
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="021-5551234"
                maxLength={20}
                style={inputStyle()}
              />
            </label>

            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              URL logo (stub)
              <input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://cdn.example.com/logo.png"
                maxLength={500}
                style={inputStyle()}
              />
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                Upload file logo defer — masukkan URL publik sementara.
              </span>
            </label>

            {logoUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  role="img"
                  aria-label="Pratinjau logo"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    background: `center / contain no-repeat url(${logoUrl})`,
                  }}
                />
                <StatusBadge label="Pratinjau logo" variant="neutral" />
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Menyimpan…' : 'Simpan Profil'}
              </Button>
              {storefrontUrl ? (
                <Link href={storefrontUrl} target="_blank" rel="noopener noreferrer">
                  <Button type="button" variant="secondary">
                    Buka Storefront
                  </Button>
                </Link>
              ) : null}
            </div>
          </form>
        </section>
      ) : (
        <EmptyState title="Profil tidak tersedia" description="Gagal memuat profil toko." />
      )}
    </div>
  );
}
