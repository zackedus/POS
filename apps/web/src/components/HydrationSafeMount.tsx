'use client';

import { useEffect, useState, type ReactNode } from 'react';

export type HydrationSafeMountProps = {
  /**
   * Content rendered only after the client has mounted.
   * Skips SSR hydration for this subtree — avoids mismatches from browser
   * extensions that inject attributes (e.g. Bitdefender `bis_skin_checked`).
   */
  children: ReactNode;
  /**
   * Placeholder during SSR and the first client paint (before `useEffect`).
   * Defaults to `null` — safest against extension-modified DOM on div trees.
   * Pass explicit loading UI when a brief empty frame is unacceptable.
   */
  fallback?: ReactNode;
};

/**
 * Defers rendering `children` until after client mount so auth-gated /
 * client-heavy routes are not hydrated from server HTML that extensions may alter.
 */
export function HydrationSafeMount({ children, fallback = null }: HydrationSafeMountProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/** Alias for discoverability — same behavior as {@link HydrationSafeMount}. */
export const ClientOnlyShell = HydrationSafeMount;
