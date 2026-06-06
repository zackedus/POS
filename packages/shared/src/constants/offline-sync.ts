/**
 * Offline sync constants — Barokah Core POS
 * @see docs/algorithm/OFFLINE-SYNC.md
 */

import { ConflictResolutionPolicy, SyncQueueOperation } from '../types/offline-sync';

/** Max pending entries per outlet per device before rejecting enqueue */
export const SYNC_QUEUE_MAX_PENDING = 500;

/** Show warning banner in cashier UI */
export const SYNC_QUEUE_WARN_THRESHOLD = 50;

/** Retry backoff base ms (exponential: base * 2^attempt) */
export const SYNC_RETRY_BASE_MS = 1000;

export const SYNC_RETRY_MAX_ATTEMPTS = 5;

/** Fallback poll interval when Background Sync API unavailable */
export const SYNC_POLL_INTERVAL_MS = 30_000;

/** Policy map: operation → conflict policy */
export const SYNC_OPERATION_CONFLICT_POLICY: Record<
  SyncQueueOperation,
  ConflictResolutionPolicy
> = {
  [SyncQueueOperation.SHIFT_OPEN]: ConflictResolutionPolicy.SERVER_WINS_MANUAL,
  [SyncQueueOperation.SHIFT_CLOSE]: ConflictResolutionPolicy.SERVER_WINS_MANUAL,
  [SyncQueueOperation.TRANSACTION_CHECKOUT]:
    ConflictResolutionPolicy.IDEMPOTENT_REPLAY,
  [SyncQueueOperation.TRANSACTION_CHECKOUT_SPLIT]:
    ConflictResolutionPolicy.IDEMPOTENT_REPLAY,
  [SyncQueueOperation.TRANSACTION_VOID]:
    ConflictResolutionPolicy.IDEMPOTENT_REPLAY,
};
