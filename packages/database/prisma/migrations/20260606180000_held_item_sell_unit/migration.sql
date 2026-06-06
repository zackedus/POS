-- Persist sell unit on held transaction lines (roll/dus recall)
ALTER TABLE "held_transaction_items"
ADD COLUMN "sell_unit_id" TEXT,
ADD COLUMN "sell_unit_symbol" TEXT;

ALTER TABLE "held_transaction_items"
ADD CONSTRAINT "held_transaction_items_sell_unit_id_fkey"
FOREIGN KEY ("sell_unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
