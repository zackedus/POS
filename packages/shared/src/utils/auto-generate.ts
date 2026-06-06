/** Random number provider — inject in tests for deterministic output. */
export type RandomFn = () => number;

const defaultRandom: RandomFn = () => Math.random();

const SKU_SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomAlphanumeric(length: number, random: RandomFn = defaultRandom): string {
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += SKU_SAFE_CHARS[Math.floor(random() * SKU_SAFE_CHARS.length)];
  }
  return result;
}

/** Uppercase slug safe for SKU/code segments (ASCII, hyphens). */
export function slugifyCode(input: string, maxLen = 20): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
    .replace(/-+$/g, '');
}

/** Derive short prefix from category or entity name (e.g. "Semen & Mortar" → "SM"). */
export function deriveNamePrefix(name: string, fallback = 'PRD'): string {
  const trimmed = name.trim();
  if (!trimmed) return fallback;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const initials = words
      .slice(0, 3)
      .map((word) => word.replace(/[^A-Za-z0-9]/g, '').charAt(0))
      .join('')
      .toUpperCase();
    if (initials.length >= 2) return initials.slice(0, 4);
  }

  const slug = slugifyCode(trimmed, 4);
  return slug || fallback;
}

export interface GenerateProductSkuOptions {
  name?: string;
  categoryName?: string;
  /** Unix ms — defaults to Date.now(). */
  timestamp?: number;
  /** Collision-avoidance suffix; auto-generated when omitted. */
  randomSuffix?: string;
  random?: RandomFn;
}

/**
 * Generate a tenant-local product SKU.
 * Prefers `{CATEGORY_PREFIX}-{NAME_SLUG}-{SUFFIX}`, falls back to `{PREFIX}-{TS36}-{SUFFIX}`.
 */
export function generateProductSku(options: GenerateProductSkuOptions = {}): string {
  const random = options.random ?? defaultRandom;
  const suffix = options.randomSuffix ?? randomAlphanumeric(4, random);
  const prefix = options.categoryName ? deriveNamePrefix(options.categoryName, 'PRD') : 'PRD';
  const namePart = options.name?.trim() ? slugifyCode(options.name, 16) : '';

  if (namePart) {
    return `${prefix}-${namePart}-${suffix}`.slice(0, 32);
  }

  const ts = (options.timestamp ?? Date.now()).toString(36).toUpperCase();
  return `${prefix}-${ts}-${suffix}`.slice(0, 32);
}

export interface GenerateVariantSkuOptions {
  existingSkus?: string[];
  random?: RandomFn;
}

/** Child variant SKU: `{PARENT}-{LABEL_SLUG}` or `{PARENT}-V01` sequence. */
export function generateVariantSku(
  parentSku: string,
  label: string,
  options: GenerateVariantSkuOptions = {},
): string {
  const base = parentSku.trim().toUpperCase();
  if (!base) return `VAR-${randomAlphanumeric(6, options.random)}`;

  const existing = new Set((options.existingSkus ?? []).map((sku) => sku.toUpperCase()));
  const labelPart = slugifyCode(label, 12);

  if (labelPart) {
    const fromLabel = `${base}-${labelPart}`.slice(0, 32);
    if (!existing.has(fromLabel)) return fromLabel;
  }

  for (let seq = 1; seq <= 99; seq += 1) {
    const candidate = `${base}-V${String(seq).padStart(2, '0')}`.slice(0, 32);
    if (!existing.has(candidate)) return candidate;
  }

  return `${base}-V${randomAlphanumeric(4, options.random)}`.slice(0, 32);
}

/** Generic code/slug from display name (categories, tags). */
export function generateCodeFromName(name: string, maxLen = 12): string {
  return slugifyCode(name, maxLen);
}

export function generateSupplierCode(name: string, random: RandomFn = defaultRandom): string {
  const part = slugifyCode(name, 10) || 'SUPPLIER';
  return `SUP-${part}-${randomAlphanumeric(3, random)}`.slice(0, 32);
}

export function generateBundleSku(name?: string, random: RandomFn = defaultRandom): string {
  if (name?.trim()) {
    const part = slugifyCode(name, 14) || 'BUNDLE';
    return `BND-${part}-${randomAlphanumeric(3, random)}`.slice(0, 32);
  }
  return `BND-${Date.now().toString(36).toUpperCase()}-${randomAlphanumeric(3, random)}`.slice(0, 32);
}

export interface GenerateExpenseRefOptions {
  date?: Date;
  sequence?: number;
}

/** Operational expense reference: EXP-YYYYMMDD-#### */
export function generateExpenseRef(options: GenerateExpenseRefOptions = {}): string {
  const date = options.date ?? new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const seq = String(options.sequence ?? 1).padStart(4, '0');
  return `EXP-${y}${m}${d}-${seq}`;
}

/** Pick next sequence for a date given existing refs (same-day). */
export function nextExpenseSequence(existingRefs: string[], date: Date = new Date()): number {
  const dayPrefix = generateExpenseRef({ date, sequence: 0 }).replace('-0000', '');
  let max = 0;

  for (const ref of existingRefs) {
    if (!ref.startsWith(dayPrefix)) continue;
    const tail = ref.slice(dayPrefix.length + 1);
    const num = Number.parseInt(tail, 10);
    if (Number.isFinite(num) && num > max) max = num;
  }

  return max + 1;
}
