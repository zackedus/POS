/** Typography scale — system font stack for zero-latency load */

export const fontFamily = {
  sans: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "ui-monospace, 'Cascadia Code', monospace",
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: 700, lineHeight: 1.2 },
  headingLg: { fontSize: 24, fontWeight: 600, lineHeight: 1.3 },
  headingMd: { fontSize: 20, fontWeight: 600, lineHeight: 1.4 },
  bodyLg: { fontSize: 16, fontWeight: 400, lineHeight: 1.5 },
  bodyMd: { fontSize: 14, fontWeight: 400, lineHeight: 1.5 },
  bodySm: { fontSize: 12, fontWeight: 500, lineHeight: 1.4 },
  mono: { fontSize: 14, fontWeight: 500, lineHeight: 1.4, fontFamily: fontFamily.mono },
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
} as const;

/** Layout breakpoints for kasir (px) */
export const breakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1366,
} as const;

/** Web kasir cart panel width — matches apps/web placeholder */
export const layout = {
  cartPanelWidth: 380,
  headerHeight: 56,
} as const;
