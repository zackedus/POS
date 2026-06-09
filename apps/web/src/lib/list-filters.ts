import { getTodayDateRange } from '@barokah/shared';

export type DateFilterDefaults = { dateFrom: string; dateTo: string };

/** Default date range: today WIB (single day). */
export function defaultDateFilters(): DateFilterDefaults {
  const { from, to } = getTodayDateRange();
  return { dateFrom: from, dateTo: to };
}

export function buildFilterChips(
  entries: Array<{ key: string; label: string; active: boolean }>,
): Array<{ key: string; label: string }> {
  return entries.filter((e) => e.active).map(({ key, label }) => ({ key, label }));
}
