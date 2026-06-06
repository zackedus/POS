import { Decimal } from '@prisma/client/runtime/library';

/** Convert Prisma Decimal / number to integer IDR for API responses. */
export function toIdrInteger(value: Decimal | number | null | undefined): number {
  if (value == null) {
    return 0;
  }
  return Math.round(Number(value));
}

/** Convert integer IDR from API to Prisma Decimal for persistence. */
export function idrToDecimal(amount: number): Decimal {
  return new Decimal(amount);
}
