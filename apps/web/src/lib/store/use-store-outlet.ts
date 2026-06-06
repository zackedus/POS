'use client';

import { useEffect, useState } from 'react';
import type { StoreOutlet } from './types';
import { mapApiError } from '@/lib/api-client';
import { fetchTenantOutlets } from './store-api';

function outletStorageKey(slug: string) {
  return `barokah-store-outlet:${slug}`;
}

export function useStoreOutlet(slug: string) {
  const [outlets, setOutlets] = useState<StoreOutlet[]>([]);
  const [outletId, setOutletIdState] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchTenantOutlets(slug)
      .then((list) => {
        if (cancelled) return;
        setOutlets(list);
        const saved = localStorage.getItem(outletStorageKey(slug));
        const initial = saved && list.some((o) => o.id === saved) ? saved : list[0]?.id ?? '';
        setOutletIdState(initial);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(mapApiError(err, 'Gagal memuat data toko.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  function setOutletId(id: string) {
    setOutletIdState(id);
    localStorage.setItem(outletStorageKey(slug), id);
  }

  return { outlets, outletId, setOutletId, loading, error };
}
