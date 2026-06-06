'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Alias — laporan penjualan & stok terintegrasi di `/dashboard` */
export default function ReportsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return null;
}
