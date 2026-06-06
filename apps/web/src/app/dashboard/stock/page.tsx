'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Alias route — Pak Zaki / docs refer to /dashboard/stock */
export default function StockRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/inventory');
  }, [router]);

  return null;
}
