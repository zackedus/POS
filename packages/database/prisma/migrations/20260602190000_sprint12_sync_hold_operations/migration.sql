-- Sprint 12: offline hold/recall via sync queue
ALTER TYPE "SyncQueueOperation" ADD VALUE 'HOLD_BILL';
ALTER TYPE "SyncQueueOperation" ADD VALUE 'RECALL_HOLD';
