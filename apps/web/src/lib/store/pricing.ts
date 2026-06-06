import { ONLINE_DELIVERY_FLAT_FEE, TAX_RATE } from '@barokah/shared';
import type { CartLine } from './types';

export function calculateSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
}

/** Flat delivery fee — synced with API `ONLINE_DELIVERY_FLAT_FEE`. */
export const DELIVERY_FLAT_FEE = ONLINE_DELIVERY_FLAT_FEE;

export function calculateOrderTotals(subtotal: number, shippingFee = 0) {
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax + shippingFee;
  return { subtotal, tax, shippingFee, total };
}
