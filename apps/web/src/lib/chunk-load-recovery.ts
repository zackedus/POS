const STORAGE_PREFIX = 'barokah_chunk_reload_';

/** Detect stale webpack/Next.js chunk load failures in dev or after deploy. */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;

  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : String(error);

  return (
    name === 'ChunkLoadError' ||
    /Loading chunk [\w./-]+ failed/i.test(message) ||
    /ChunkLoadError/i.test(message)
  );
}

/**
 * Reload once per scope to recover from stale chunk references.
 * Returns true when a reload was triggered.
 */
export function tryRecoverFromChunkError(scope: string): boolean {
  if (typeof window === 'undefined') return false;

  const key = `${STORAGE_PREFIX}${scope}`;
  if (sessionStorage.getItem(key)) return false;

  sessionStorage.setItem(key, '1');
  window.location.reload();
  return true;
}

/** Clear reload guard after a successful page load (call on mount). */
export function clearChunkReloadGuard(scope: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(`${STORAGE_PREFIX}${scope}`);
}
