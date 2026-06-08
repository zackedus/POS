-- Receivable payment proof & multi-method fields

ALTER TABLE "receivable_payments" ADD COLUMN IF NOT EXISTS "transfer_reference" TEXT;
ALTER TABLE "receivable_payments" ADD COLUMN IF NOT EXISTS "bank_name" TEXT;
ALTER TABLE "receivable_payments" ADD COLUMN IF NOT EXISTS "proof_url" TEXT;
ALTER TABLE "receivable_payments" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "receivable_payments" ADD COLUMN IF NOT EXISTS "deposit_transaction_id" TEXT;
ALTER TABLE "receivable_payments" ADD COLUMN IF NOT EXISTS "shift_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "receivable_payments_deposit_transaction_id_key"
  ON "receivable_payments"("deposit_transaction_id");

CREATE INDEX IF NOT EXISTS "receivable_payments_shift_id_idx"
  ON "receivable_payments"("shift_id");

ALTER TABLE "receivable_payments"
  ADD CONSTRAINT "receivable_payments_deposit_transaction_id_fkey"
  FOREIGN KEY ("deposit_transaction_id") REFERENCES "deposit_transactions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "receivable_payments"
  ADD CONSTRAINT "receivable_payments_shift_id_fkey"
  FOREIGN KEY ("shift_id") REFERENCES "shifts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
