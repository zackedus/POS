/** Default business timezone for Barokah POS (WIB). */
export const DEFAULT_APP_TIMEZONE = 'Asia/Jakarta';

/**
 * ISO calendar date (YYYY-MM-DD) for today in the given IANA timezone.
 * Uses `en-CA` locale for stable YYYY-MM-DD formatting.
 */
export function getTodayDate(timeZone: string = DEFAULT_APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Single-day default range: both `from` and `to` are today. */
export function getTodayDateRange(
  timeZone: string = DEFAULT_APP_TIMEZONE,
): { from: string; to: string } {
  const today = getTodayDate(timeZone);
  return { from: today, to: today };
}

/** Alias for {@link getTodayDate} — legacy call sites in web app. */
export function todayIsoDate(timeZone?: string): string {
  return getTodayDate(timeZone);
}
