const ID_NUMBER_AUTO = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

/** Format number using Indonesian locale (e.g. 1.000 or 1,5). */
export function formatNumberID(value: number, decimals?: number): string {
  if (!Number.isFinite(value)) {
    return decimals !== undefined ? formatNumberID(0, decimals) : '0';
  }

  if (decimals !== undefined) {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  return ID_NUMBER_AUTO.format(value);
}

/**
 * Parse user quantity input in Indonesian or plain numeric form.
 * Examples: "1,5" → 1.5, "0.5" → 0.5, "1.000" → 1000
 */
export function parseQuantityInput(input: string): number {
  let s = input.trim().replace(/\s/g, '');
  if (!s) {
    return 0;
  }

  const negative = s.startsWith('-');
  if (negative) {
    s = s.slice(1);
  }

  const commaIdx = s.lastIndexOf(',');
  if (commaIdx !== -1) {
    const intPart = s.slice(0, commaIdx).replace(/\./g, '');
    const decPart = s.slice(commaIdx + 1);
    const num = parseFloat(`${intPart}.${decPart}`);
    if (!Number.isFinite(num)) {
      return 0;
    }
    return negative ? -num : num;
  }

  const dotCount = (s.match(/\./g) ?? []).length;
  if (dotCount > 0) {
    const lastDot = s.lastIndexOf('.');
    const afterDot = s.slice(lastDot + 1);
    if (dotCount > 1 || (afterDot.length === 3 && /^\d+$/.test(afterDot))) {
      const num = parseFloat(s.replace(/\./g, ''));
      if (!Number.isFinite(num)) {
        return 0;
      }
      return negative ? -num : num;
    }

    const num = parseFloat(s);
    if (!Number.isFinite(num)) {
      return 0;
    }
    return negative ? -num : num;
  }

  const num = parseFloat(s);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return negative ? -num : num;
}
