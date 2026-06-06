-- Sprint 11: Offline PWA sync queue foundation

CREATE TYPE "SyncQueueOperation" AS ENUM ('CHECKOUT_CASH', 'CHECKOUT_SPLIT');
CREATE TYPE "SyncQueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'APPLIED', 'CONFLICT', 'FAILED');

CREATE TABLE "sync_queue_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "cashier_id" TEXT NOT NULL,
    "client_request_id" TEXT NOT NULL,
    "operation" "SyncQueueOperation" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "SyncQueueStatus" NOT NULL DEFAULT 'PENDING',
    "conflict_code" TEXT,
    "conflict_message" TEXT,
    "transaction_id" TEXT,
    "device_id" TEXT,
    "client_created_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_queue_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sync_queue_entries_outlet_id_client_request_id_key" ON "sync_queue_entries"("outlet_id", "client_request_id");
CREATE INDEX "sync_queue_entries_outlet_id_status_idx" ON "sync_queue_entries"("outlet_id", "status");
CREATE INDEX "sync_queue_entries_tenant_id_created_at_idx" ON "sync_queue_entries"("tenant_id", "created_at");

ALTER TABLE "sync_queue_entries" ADD CONSTRAINT "sync_queue_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sync_queue_entries" ADD CONSTRAINT "sync_queue_entries_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sync_queue_entries" ADD CONSTRAINT "sync_queue_entries_cashier_id_fkey" FOREIGN KEY ("cashier_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
