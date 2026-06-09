'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { StorefrontPublicConfig } from '@barokah/shared';
import { defaultStorefrontSettings } from '@barokah/shared';
import { fetchStoreConfig } from './store-api';

interface StoreConfigContextValue {
  config: StorefrontPublicConfig | null;
  loading: boolean;
  error: string | null;
  accentColor: string;
}

const StoreConfigContext = createContext<StoreConfigContextValue | null>(null);

export function StoreConfigProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [config, setConfig] = useState<StorefrontPublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchStoreConfig(slug)
      .then((data) => {
        if (!cancelled) {
          setConfig(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setConfig(null);
          setError(err instanceof Error ? err.message : 'Gagal memuat konfigurasi toko.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const accentColor = config?.settings.appearance.accentColor ?? defaultStorefrontSettings().appearance.accentColor;

  const value = useMemo(
    () => ({ config, loading, error, accentColor }),
    [config, loading, error, accentColor],
  );

  return <StoreConfigContext.Provider value={value}>{children}</StoreConfigContext.Provider>;
}

export function useStoreConfig() {
  const ctx = useContext(StoreConfigContext);
  if (!ctx) {
    throw new Error('useStoreConfig must be used within StoreConfigProvider');
  }
  return ctx;
}
