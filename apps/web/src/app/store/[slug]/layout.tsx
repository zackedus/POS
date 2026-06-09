'use client';

import { useParams } from 'next/navigation';
import { colors } from '@barokah/ui';
import { StoreFooter } from '@/components/store/StoreFooter';
import { StoreHeader } from '@/components/store/StoreHeader';
import { CartProvider } from '@/lib/store/cart-context';
import { StoreConfigProvider } from '@/lib/store/store-config-context';
import { StoreCustomerAuthProvider } from '@/lib/store/store-customer-auth-context';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <StoreConfigProvider slug={slug}>
      <StoreCustomerAuthProvider slug={slug}>
        <CartProvider slug={slug}>
        <div
          style={{
            minHeight: '100vh',
            background: colors.light.bg.base,
            color: colors.light.text.primary,
            maxWidth: 480,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <StoreHeader />
          <main style={{ flex: 1 }}>{children}</main>
          <StoreFooter />
        </div>
        </CartProvider>
      </StoreCustomerAuthProvider>
    </StoreConfigProvider>
  );
}
