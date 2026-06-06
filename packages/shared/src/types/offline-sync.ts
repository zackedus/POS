/**
 * Offline sync queue types — Barokah Core POS
 * @see docs/algorithm/OFFLINE-SYNC.md
 */

/** Queue operation types (financial queue) */
export enum SyncQueueOperation {
  SHIFT_OPEN = 'SHIFT_OPEN',
  SHIFT_CLOSE = 'SHIFT_CLOSE',
  TRANSACTION_CHECKOUT = 'TRANSACTION_CHECKOUT',
  TRANSACTION_CHECKOUT_SPLIT = 'TRANSACTION_CHECKOUT_SPLIT',
  TRANSACTION_VOID = 'TRANSACTION_VOID',
}

/** Local queue entry lifecycle */
export enum SyncQueueEntryStatus {
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
  DEAD = 'DEAD',
}

/**
 * Conflict resolution policy per entity class.
 * @see docs/algorithm/OFFLINE-SYNC.md
 */
export enum ConflictResolutionPolicy {
  /** clientRequestId replay — no duplicate writes */
  IDEMPOTENT_REPLAY = 'IDEMPOTENT_REPLAY',
  /** Server authoritative; client must accept or manual resolve */
  SERVER_WINS = 'SERVER_WINS',
  /** Server wins with cashier/manager UI (stock, shift) */
  SERVER_WINS_MANUAL = 'SERVER_WINS_MANUAL',
  /** Non-financial metadata only */
  LAST_WRITE_WINS = 'LAST_WRITE_WINS',
}

/** Manual resolve action after sync failure */
export type SyncConflictResolutionAction =
  | 'RETRY'
  | 'ADJUST_QTY'
  | 'CANCEL'
  | 'ESCALATE_MANAGER'
  /** Server wins — discard local queue entry and accept server state */
  | 'USE_SERVER'
  /** Client wins — retry sync with local payload */
  | 'KEEP_CLIENT';

export interface SyncConflictResolution {
  queueEntryId: string;
  resolution: SyncConflictResolutionAction;
  resolvedByUserId?: string;
  resolvedAt: string;
  note?: string;
}

/** Minimal fields for ordering — full record lives in IndexedDB (web) */
export interface SyncQueueEntryRef {
  id: string;
  outletId: string;
  deviceId: string;
  operation: SyncQueueOperation;
  clientRequestId: string;
  sequence: number;
  createdAt: string;
  dependsOn: string | null;
  status: SyncQueueEntryStatus;
}

/** API meta flag on idempotent replay */
export interface SyncResponseMeta {
  idempotentReplay?: boolean;
}
