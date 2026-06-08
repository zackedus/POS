/** Allowed credit payment terms (days) for tempo checkout. */
export const CREDIT_TERMS_DAYS_OPTIONS = [7, 14, 30] as const;

export type CreditTermsDays = (typeof CREDIT_TERMS_DAYS_OPTIONS)[number];

/** Default tenant credit terms when POS does not override. */
export const DEFAULT_CREDIT_TERMS_DAYS: CreditTermsDays = 30;

export function isValidCreditTermsDays(value: number): value is CreditTermsDays {
  return (CREDIT_TERMS_DAYS_OPTIONS as readonly number[]).includes(value);
}
