'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { colors } from '@barokah/ui';
import { useStoreCart } from '@/lib/store/cart-context';
import { shortCustomerName } from '@/lib/store/store-auth-redirect';
import { useStoreConfig } from '@/lib/store/store-config-context';
import { useStoreCustomerAuth } from '@/lib/store/store-customer-auth-context';

const navLinkStyle = (accentColor: string): React.CSSProperties => ({
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: accentColor,
  textDecoration: 'none',
  padding: '0.35rem 0.5rem',
});

export function StoreHeader() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { itemCount } = useStoreCart();
  const { config, accentColor } = useStoreConfig();
  const { isLoggedIn, customer, clearSession } = useStoreCustomerAuth();
  const tenantName = config?.tenant.name ?? slug;
  const logoUrl = config?.tenant.logoUrl;

  function handleLogout() {
    clearSession();
    router.push(`/store/${slug}`);
  }

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        minHeight: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem',
        background: colors.light.bg.base,
        borderBottom: `1px solid ${colors.light.border.default}`,
      }}
    >
      <Link
        href={`/store/${slug}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          textDecoration: 'none',
          color: colors.light.text.primary,
        }}
      >
        {logoUrl ? (
          <img src={logoUrl} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain' }} />
        ) : (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: accentColor,
              color: colors.light.text.inverse,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.875rem',
            }}
          >
            {tenantName.charAt(0)}
          </div>
        )}
        <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{tenantName}</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <Link href={`/store/${slug}/products`} style={navLinkStyle(accentColor)}>
          Katalog
        </Link>
        {isLoggedIn ? (
          <>
            <Link
              href={`/store/${slug}/account`}
              style={navLinkStyle(accentColor)}
              title={customer?.name}
            >
              Akun{customer?.name ? ` (${shortCustomerName(customer.name)})` : ''}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                ...navLinkStyle(accentColor),
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Keluar
            </button>
          </>
        ) : (
          <>
            <Link href={`/store/${slug}/login`} style={navLinkStyle(accentColor)}>
              Masuk
            </Link>
            <Link href={`/store/${slug}/register`} style={navLinkStyle(accentColor)}>
              Daftar
            </Link>
          </>
        )}
        <Link href={`/store/${slug}/orders`} style={navLinkStyle(accentColor)}>
          Pesanan
        </Link>
        <Link
          href={`/store/${slug}/cart`}
          aria-label="Keranjang"
          style={{
            position: 'relative',
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            fontSize: '1.25rem',
          }}
        >
          🛒
          {itemCount > 0 ? (
            <span
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                background: colors.semantic.error,
                color: colors.light.text.inverse,
                fontSize: '0.6875rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
              }}
            >
              {itemCount}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}
