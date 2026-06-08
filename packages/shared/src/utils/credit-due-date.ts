import { DEFAULT_CREDIT_TERMS_DAYS, isValidCreditTermsDays } from '../constants/credit-terms';

/**
 * Compute ISO date (YYYY-MM-DD) for receivable due date from terms in days.
 * Uses UTC calendar date to align with Prisma @db.Date storage.
 */
export function computeCreditDueDate(
  termsDays: number,
  fromDate: Date = new Date(),
): string {
  const days = isValidCreditTermsDays(termsDays) ? termsDays : DEFAULT_CREDIT_TERMS_DAYS;
  const base = new Date(fromDate);
  base.setUTCHours(0, 0, 0, 0);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}
