/** Barokah Core POS design tokens — see docs/design/DESIGN-SYSTEM.md */

export const colors = {
  primary: {
    50: '#ECFDF5',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    900: '#14532D',
  },
  semantic: {
    success: '#16A34A',
    warning: '#D97706',
    error: '#DC2626',
    info: '#2563EB',
  },
  light: {
    bg: { base: '#FFFFFF', muted: '#F1F5F9', elevated: '#FFFFFF' },
    text: { primary: '#0F172A', secondary: '#64748B', inverse: '#FFFFFF' },
    border: { default: '#E2E8F0' },
  },
  dark: {
    bg: { base: '#0F172A', muted: '#1E293B', elevated: '#334155' },
    text: { primary: '#F8FAFC', secondary: '#94A3B8', inverse: '#0F172A' },
    border: { default: '#475569' },
  },
} as const;

export type ColorTheme = 'light' | 'dark';

export function getThemeColors(theme: ColorTheme) {
  return {
    primary: colors.primary,
    semantic: colors.semantic,
    ...colors[theme],
  };
}
