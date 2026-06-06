-- Sprint 13 Track A: idempotent hold bill via client_request_id per outlet
ALTER TABLE "held_transactions" ADD COLUMN "client_request_id" TEXT;

CREATE UNIQUE INDEX "held_transactions_outlet_id_client_request_id_key"
  ON "held_transactions"("outlet_id", "client_request_id");
