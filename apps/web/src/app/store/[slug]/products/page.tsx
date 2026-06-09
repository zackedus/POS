'use client';

import { useParams } from 'next/navigation';
import { StoreCatalogGrid } from '@/components/store/StoreCatalogGrid';

export default function StoreProductsPage() {
  const params = useParams();
  const slug = params.slug as string;
  return <StoreCatalogGrid slug={slug} title="Katalog Produk" />;
}
