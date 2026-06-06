'use client';

import { useParams } from 'next/navigation';
import { colors } from '@barokah/ui';
import { StoreHeader } from '@/components/store/StoreHeader';
import { CartProvider } from '@/lib/store/cart-context';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <CartProvider slug={slug}>
      <div
        style={{
          minHeight: '100vh',
          background: colors.light.bg.base,
          color: colors.light.text.primary,
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        <StoreHeader />
        <main>{children}</main>
      </div>
    </CartProvider>
  );
}
