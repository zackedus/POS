'use client';

const STORAGE_KEY = 'barokah_admin_theme';

export type AdminTheme = 'light' | 'dark';

export function getStoredAdminTheme(): AdminTheme {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'dark' ? 'dark' : 'light';
}

export function persistAdminTheme(theme: AdminTheme): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, theme);
  applyAdminTheme(theme);
}

export function applyAdminTheme(theme: AdminTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.adminTheme = theme;
}

export const adminThemeTokens = {
  light: {
    shellBg: '#f1f5f9',
    headerBg: '#ffffff',
    headerBorder: '#e2e8f0',
    text: '#0f172a',
    muted: '#64748b',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
  },
  dark: {
    shellBg: '#0f172a',
    headerBg: '#1e293b',
    headerBorder: '#334155',
    text: '#f8fafc',
    muted: '#94a3b8',
    cardBg: '#1e293b',
    cardBorder: '#334155',
  },
} as const;

export function resolveAdminTokens(theme: AdminTheme) {
  return adminThemeTokens[theme];
}
