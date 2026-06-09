'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/** Backward compatibility redirect: /store/[slug]/p/[productId] → /products/[id] */
export default function LegacyProductRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const productId = params.productId as string;

  useEffect(() => {
    router.replace(`/store/${slug}/products/${productId}`);
  }, [router, slug, productId]);

  return <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>Mengalihkan…</div>;
}
