/** POS checkout tax (PPN) — exclusive on net subtotal after discount. */
export function computePosTax(params: {
  subtotal: number;
  discount: number;
  ppnEnabled: boolean;
  ppnRatePercent: number;
}): { tax: number; total: number; taxableBase: number } {
  const taxableBase = Math.max(0, params.subtotal - params.discount);
  if (!params.ppnEnabled || params.ppnRatePercent <= 0) {
    return { tax: 0, total: taxableBase, taxableBase };
  }
  const tax = Math.round(taxableBase * (params.ppnRatePercent / 100));
  return { tax, total: taxableBase + tax, taxableBase };
}
