-- Payment receipt numbers for finance payment actions (deposit, payable, receivable)

CREATE TABLE "payment_receipt_sequences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "receipt_type" TEXT NOT NULL,
    "sequence_date" DATE NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "payment_receipt_sequences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_receipt_sequences_tenant_id_receipt_type_sequence_date_key" ON "payment_receipt_sequences"("tenant_id", "receipt_type", "sequence_date");

ALTER TABLE "payment_receipt_sequences" ADD CONSTRAINT "payment_receipt_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "receivable_payments" ADD COLUMN "receipt_number" TEXT;
ALTER TABLE "payable_payments" ADD COLUMN "receipt_number" TEXT;
ALTER TABLE "deposit_transactions" ADD COLUMN "receipt_number" TEXT;

CREATE INDEX "receivable_payments_receipt_number_idx" ON "receivable_payments"("receipt_number");
CREATE UNIQUE INDEX "payable_payments_receipt_number_key" ON "payable_payments"("receipt_number");
CREATE UNIQUE INDEX "deposit_transactions_receipt_number_key" ON "deposit_transactions"("receipt_number");
