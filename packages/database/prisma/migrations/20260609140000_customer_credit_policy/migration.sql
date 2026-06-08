-- Customer credit policy: default limit tracking, auto-increase flag, immutable audit log

ALTER TABLE "customers" ADD COLUMN "auto_limit_enabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TYPE "CustomerCreditAuditAction" AS ENUM (
  'LIMIT_SET',
  'LIMIT_AUTO_INCREASE',
  'OVER_LIMIT_APPROVAL',
  'CREDIT_SALE'
);

CREATE TABLE "customer_credit_audit_logs" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "action" "CustomerCreditAuditAction" NOT NULL,
  "old_limit" DECIMAL(15,2),
  "new_limit" DECIMAL(15,2),
  "amount" DECIMAL(15,2),
  "transaction_id" TEXT,
  "approved_by_id" TEXT,
  "recorded_by_id" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_credit_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_credit_audit_logs_customer_id_created_at_idx" ON "customer_credit_audit_logs"("customer_id", "created_at");
CREATE INDEX "customer_credit_audit_logs_tenant_id_idx" ON "customer_credit_audit_logs"("tenant_id");

ALTER TABLE "customer_credit_audit_logs" ADD CONSTRAINT "customer_credit_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_credit_audit_logs" ADD CONSTRAINT "customer_credit_audit_logs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_credit_audit_logs" ADD CONSTRAINT "customer_credit_audit_logs_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_credit_audit_logs" ADD CONSTRAINT "customer_credit_audit_logs_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_credit_audit_logs" ADD CONSTRAINT "customer_credit_audit_logs_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
