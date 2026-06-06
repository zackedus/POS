const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** Format ISO date string or Date to Indonesian locale display. */
export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return DATE_FORMATTER.format(date);
}

/** Format date only (no time). */
export function formatDateOnly(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date);
}
