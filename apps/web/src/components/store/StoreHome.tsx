'use client';

import Link from 'next/link';
import { Button, colors } from '@barokah/ui';
import { StoreCatalogGrid } from '@/components/store/StoreCatalogGrid';
import { useStoreConfig } from '@/lib/store/store-config-context';
import { useStoreOutlet } from '@/lib/store/use-store-outlet';

export function StoreHome({ slug }: { slug: string }) {
  const { config, loading, error, accentColor } = useStoreConfig();
  const { outlets, outletId, setOutletId, loading: outletLoading } = useStoreOutlet(slug);

  if (loading) {
    return <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>Memuat toko…</div>;
  }

  if (error || !config) {
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center', color: colors.semantic.error }}>
        {error ?? 'Toko tidak ditemukan.'}
      </div>
    );
  }

  const { tenant, settings, featuredCategories } = config;
  const closed = settings.operations.temporarilyClosed || !settings.enabled;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {closed ? (
        <div role="alert" style={{ margin: '0.875rem 0.875rem 0', padding: '0.875rem', borderRadius: 10, background: '#fef3c7', color: '#92400e', fontSize: '0.875rem' }}>
          {settings.operations.closedMessage}
        </div>
      ) : null}

      {settings.appearance.promoBannerText ? (
        <div style={{ background: accentColor, color: '#fff', textAlign: 'center', padding: '0.5rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600 }}>
          {settings.appearance.promoBannerText}
        </div>
      ) : null}

      <section
        style={{
          margin: '0 0.875rem',
          borderRadius: 12,
          overflow: 'hidden',
          background: settings.appearance.heroImageUrl
            ? `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.45)), center / cover no-repeat url(${settings.appearance.heroImageUrl})`
            : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
          color: '#fff',
          padding: '1.5rem 1rem',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.8125rem', opacity: 0.9 }}>{settings.appearance.tagline}</p>
        <h1 style={{ margin: '0.35rem 0', fontSize: '1.375rem', lineHeight: 1.25 }}>{settings.appearance.heroTitle || tenant.name}</h1>
        <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', opacity: 0.95 }}>{settings.appearance.heroSubtitle}</p>
        {tenant.description ? <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', opacity: 0.9 }}>{tenant.description}</p> : null}

        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8125rem' }}>
            Pilih cabang untuk cek stok
            <select
              value={outletId}
              onChange={(e) => setOutletId(e.target.value)}
              disabled={outletLoading}
              style={{ display: 'block', width: '100%', marginTop: 4, minHeight: 44, borderRadius: 8, border: 'none', padding: '0.5rem' }}
            >
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </select>
          </label>
          <Link href={`/store/${slug}/products`} style={{ textDecoration: 'none' }}>
            <Button fullWidth style={{ background: '#fff', color: accentColor, border: 'none' }}>
              Lihat Katalog Produk
            </Button>
          </Link>
        </div>
      </section>

      {featuredCategories.length > 0 ? (
        <section style={{ padding: '0 0.875rem' }}>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Kategori Unggulan</h2>
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
            {featuredCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/store/${slug}/products?category=${cat.id}`}
                style={{
                  flexShrink: 0,
                  padding: '0.625rem 0.875rem',
                  borderRadius: 999,
                  border: `1px solid ${accentColor}`,
                  color: accentColor,
                  textDecoration: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  minHeight: 44,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <StoreCatalogGrid slug={slug} title="Produk Populer" compact limit={8} />
    </div>
  );
}
