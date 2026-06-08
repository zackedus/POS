/** Normalize Indonesian phone to digits with 62 country prefix. */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('62')) {
    return digits;
  }
  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }
  return digits;
}

/** Display stored 62-prefixed phone as local 08… format for kasir input. */
export function formatPhoneDisplay(normalized: string): string {
  const digits = normalized.replace(/\D/g, '');
  if (digits.startsWith('62')) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

/** True when input can be normalized to a valid Indonesian mobile (628…). */
export function isValidIndonesianMobilePhone(phone: string): boolean {
  const normalized = normalizePhone(phone.trim());
  return /^628\d{8,11}$/.test(normalized);
}
