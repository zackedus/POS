'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface StoreCustomerProfile {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  memberCode: string;
  points: number;
  memberSince: string;
  addressCount: number;
}

export interface StoreCustomerAddress {
  id: string;
  label: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  province: string | null;
  postalCode: string | null;
  isDefault: boolean;
}

interface StoredSession {
  accessToken: string;
  refreshToken: string;
  customer: StoreCustomerProfile;
}

interface StoreCustomerAuthContextValue {
  customer: StoreCustomerProfile | null;
  accessToken: string | null;
  isLoggedIn: boolean;
  loading: boolean;
  setSession: (session: StoredSession) => void;
  clearSession: () => void;
  refreshProfile: () => Promise<void>;
}

const StoreCustomerAuthContext = createContext<StoreCustomerAuthContextValue | null>(null);

function storageKey(slug: string) {
  return `barokah-store-customer:${slug}`;
}

function readStored(slug: string): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function writeStored(slug: string, session: StoredSession | null) {
  if (typeof window === 'undefined') return;
  if (!session) {
    localStorage.removeItem(storageKey(slug));
    return;
  }
  localStorage.setItem(storageKey(slug), JSON.stringify(session));
}

export function StoreCustomerAuthProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [customer, setCustomer] = useState<StoreCustomerProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function hydrateSession() {
      const stored = readStored(slug);
      if (!stored) {
        if (!cancelled) setLoading(false);
        return;
      }

      if (!cancelled) {
        setCustomer(stored.customer);
        setAccessToken(stored.accessToken);
      }

      try {
        const { fetchStoreCustomerMe } = await import('@/lib/store/store-api');
        const profile = await fetchStoreCustomerMe(slug, stored.accessToken);
        if (cancelled) return;
        setCustomer(profile);
        writeStored(slug, { ...stored, customer: profile });
      } catch (err) {
        const code = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : '';
        if (code === 'UNAUTHORIZED' || code === 'INVALID_CREDENTIALS') {
          if (!cancelled) {
            setCustomer(null);
            setAccessToken(null);
            writeStored(slug, null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void hydrateSession();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const setSession = useCallback(
    (session: StoredSession) => {
      setCustomer(session.customer);
      setAccessToken(session.accessToken);
      writeStored(slug, session);
    },
    [slug],
  );

  const clearSession = useCallback(() => {
    setCustomer(null);
    setAccessToken(null);
    writeStored(slug, null);
  }, [slug]);

  const refreshProfile = useCallback(async () => {
    if (!accessToken) return;
    const { fetchStoreCustomerMe } = await import('@/lib/store/store-api');
    try {
      const profile = await fetchStoreCustomerMe(slug, accessToken);
      setCustomer(profile);
      const stored = readStored(slug);
      if (stored) {
        writeStored(slug, { ...stored, customer: profile });
      }
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : '';
      if (code === 'UNAUTHORIZED' || code === 'INVALID_CREDENTIALS') {
        setCustomer(null);
        setAccessToken(null);
        writeStored(slug, null);
      }
      throw err;
    }
  }, [accessToken, slug]);

  const value = useMemo(
    () => ({
      customer,
      accessToken,
      isLoggedIn: Boolean(customer && accessToken),
      loading,
      setSession,
      clearSession,
      refreshProfile,
    }),
    [customer, accessToken, loading, setSession, clearSession, refreshProfile],
  );

  return <StoreCustomerAuthContext.Provider value={value}>{children}</StoreCustomerAuthContext.Provider>;
}

export function useStoreCustomerAuth() {
  const ctx = useContext(StoreCustomerAuthContext);
  if (!ctx) {
    throw new Error('useStoreCustomerAuth must be used within StoreCustomerAuthProvider');
  }
  return ctx;
}

export type { StoredSession };
