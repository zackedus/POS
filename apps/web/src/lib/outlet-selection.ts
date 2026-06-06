const STORAGE_KEY = 'barokah_selected_outlet_id';

/** Persisted outlet selection for multi-outlet owners (dev: localStorage). */
export const outletSelectionStorage = {
  get: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
  },
  set: (outletId: string) => {
    localStorage.setItem(STORAGE_KEY, outletId);
  },
  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
  },
};

/** Resolve effective outlet: stored value if valid, else sole outlet, else null (must pick). */
export function resolveSelectedOutletId(
  outletIds: string[],
  storedId: string | null,
): string | null {
  if (outletIds.length === 0) return null;
  if (outletIds.length === 1) return outletIds[0];
  if (storedId && outletIds.includes(storedId)) return storedId;
  return null;
}

/** Fallback label when outlet names API is unavailable. */
export function outletDisplayLabel(outletId: string, index: number): string {
  return `Cabang ${index + 1} (${outletId.slice(-6)})`;
}
