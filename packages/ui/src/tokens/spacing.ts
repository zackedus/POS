/** Spacing scale — base unit 4px */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  /** Minimum touch target for kasir UI (WCAG / POS best practice) */
  touchTarget: 48,
  /** Numpad key size for cash input */
  numpadKey: 56,
} as const;

export type SpacingToken = keyof typeof spacing;
