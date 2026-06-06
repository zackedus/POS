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
import type { CartLine } from './types';

const CART_TTL_MS = 24 * 60 * 60 * 1000;

interface PersistedCart {
  lines: CartLine[];
  savedAt: number;
}

interface CartContextValue {
  lines: CartLine[];
  itemCount: number;
  addItem: (line: Omit<CartLine, 'quantity'> & { quantity?: number }) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function storageKey(slug: string) {
  return `barokah-store-cart:${slug}`;
}

function loadCart(slug: string): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedCart;
    if (Date.now() - parsed.savedAt > CART_TTL_MS) {
      localStorage.removeItem(storageKey(slug));
      return [];
    }
    return parsed.lines ?? [];
  } catch {
    return [];
  }
}

function saveCart(slug: string, lines: CartLine[]) {
  if (typeof window === 'undefined') return;
  const payload: PersistedCart = { lines, savedAt: Date.now() };
  localStorage.setItem(storageKey(slug), JSON.stringify(payload));
}

export function CartProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(loadCart(slug));
    setHydrated(true);
  }, [slug]);

  useEffect(() => {
    if (!hydrated) return;
    saveCart(slug, lines);
  }, [slug, lines, hydrated]);

  const addItem = useCallback(
    (item: Omit<CartLine, 'quantity'> & { quantity?: number }) => {
      const qty = item.quantity ?? 1;
      setLines((prev) => {
        const existing = prev.find((l) => l.productId === item.productId);
        if (existing) {
          return prev.map((l) =>
            l.productId === item.productId ? { ...l, quantity: l.quantity + qty } : l,
          );
        }
        return [...prev, { ...item, quantity: qty }];
      });
    },
    [],
  );

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setLines((prev) =>
      prev
        .map((l) => (l.productId === productId ? { ...l, quantity } : l))
        .filter((l) => l.quantity > 0),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  const itemCount = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines],
  );

  const value = useMemo(
    () => ({ lines, itemCount, addItem, updateQuantity, removeItem, clearCart }),
    [lines, itemCount, addItem, updateQuantity, removeItem, clearCart],
  );

  const Provider = CartContext.Provider as React.FC<{
    value: CartContextValue;
    children: ReactNode;
  }>;

  return <Provider value={value}>{children}</Provider>;
}

export function useStoreCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useStoreCart must be used within CartProvider');
  }
  return ctx;
}
