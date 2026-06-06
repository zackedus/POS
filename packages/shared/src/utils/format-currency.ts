const IDR_AMOUNT = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format integer rupiah for display: "Rp 1.000.000". */
export function formatCurrencyIDR(amount: number): string {
  if (!Number.isFinite(amount)) {
    return 'Rp 0';
  }
  return `Rp ${IDR_AMOUNT.format(Math.round(amount))}`;
}

/** Format rupiah digits only (no prefix) for editable fields. */
export function formatCurrencyAmountOnly(amount: number): string {
  if (!Number.isFinite(amount)) {
    return '0';
  }
  return IDR_AMOUNT.format(Math.round(amount));
}

/**
 * Parse currency input in Indonesian or plain numeric form.
 * Examples: "1.000.000", "Rp 1.000.000", "1000000" → 1000000
 */
export function parseCurrencyInput(input: string): number {
  let s = input.trim();
  if (!s) {
    return 0;
  }

  s = s.replace(/^Rp\s*/i, '').replace(/\s/g, '');

  const commaIdx = s.lastIndexOf(',');
  if (commaIdx !== -1) {
    const intPart = s.slice(0, commaIdx).replace(/\./g, '');
    const decPart = s.slice(commaIdx + 1);
    const num = parseFloat(`${intPart}.${decPart}`);
    return Number.isFinite(num) ? Math.round(num) : 0;
  }

  const digits = s.replace(/\./g, '');
  const parsed = parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** @deprecated Use formatCurrencyIDR — kept for backward compatibility. */
export function formatCurrency(amount: number): string {
  return formatCurrencyIDR(amount);
}

/** @deprecated Use parseCurrencyInput — kept for backward compatibility. */
export function parseCurrency(value: string): number {
  return parseCurrencyInput(value);
}
