'use client';

import { useEffect, useState } from 'react';
import {
  applyAdminTheme,
  getStoredAdminTheme,
  persistAdminTheme,
  resolveAdminTokens,
  type AdminTheme,
} from '@/lib/admin-theme';

export function useAdminTheme() {
  const [theme, setTheme] = useState<AdminTheme>('light');

  useEffect(() => {
    const stored = getStoredAdminTheme();
    setTheme(stored);
    applyAdminTheme(stored);
  }, []);

  function toggleTheme() {
    const next: AdminTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    persistAdminTheme(next);
  }

  return {
    theme,
    tokens: resolveAdminTokens(theme),
    toggleTheme,
    isDark: theme === 'dark',
  };
}
