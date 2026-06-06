/**
 * Deterministic FIFO ordering for offline sync queue entries.
 * @see docs/algorithm/OFFLINE-SYNC.md
 */

import type { SyncQueueEntryRef } from '../types/offline-sync';

/**
 * Compare two queue entries for drain order (ascending = earlier first).
 * Primary: createdAt ISO string. Secondary: sequence (monotonic per device).
 */
export function compareSyncQueueOrder(
  a: SyncQueueEntryRef,
  b: SyncQueueEntryRef,
): number {
  const timeCmp = a.createdAt.localeCompare(b.createdAt);
  if (timeCmp !== 0) {
    return timeCmp;
  }
  return a.sequence - b.sequence;
}

/** True if `entry` may be sent (parent synced or no dependency). */
export function isSyncQueueEntryReady(
  entry: SyncQueueEntryRef,
  syncedIds: ReadonlySet<string>,
): boolean {
  if (!entry.dependsOn) {
    return true;
  }
  return syncedIds.has(entry.dependsOn);
}
