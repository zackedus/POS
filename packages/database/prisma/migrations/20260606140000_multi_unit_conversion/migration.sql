-- Multi-unit conversion: purchase unit (dus) + fractional sell (kg)
ALTER TABLE "product_unit_conversions"
ADD COLUMN "is_purchase_unit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "is_sell_unit" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "sell_step" DECIMAL(15,3),
ADD COLUMN "min_qty" DECIMAL(15,3);

-- Allow fractional MOQ / order step on product (e.g. 0.5 kg)
ALTER TABLE "products"
ALTER COLUMN "moq" TYPE DECIMAL(15,3) USING "moq"::DECIMAL(15,3),
ALTER COLUMN "order_step" TYPE DECIMAL(15,3) USING "order_step"::DECIMAL(15,3);

ALTER TABLE "products"
ALTER COLUMN "moq" SET DEFAULT 1,
ALTER COLUMN "order_step" SET DEFAULT 1;

-- Optional sell-unit snapshot on transaction lines
ALTER TABLE "transaction_items"
ADD COLUMN "sell_unit_id" TEXT,
ADD COLUMN "sell_unit_symbol" TEXT;

ALTER TABLE "transaction_items"
ADD CONSTRAINT "transaction_items_sell_unit_id_fkey"
FOREIGN KEY ("sell_unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
