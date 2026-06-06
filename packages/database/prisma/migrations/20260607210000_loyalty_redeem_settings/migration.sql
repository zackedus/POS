-- Loyalty redeem MVP settings per tenant
ALTER TABLE "tenant_settings"
  ADD COLUMN IF NOT EXISTS "loyalty_redeem_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "loyalty_redeem_value_idr" INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS "loyalty_redeem_max_percent" INTEGER NOT NULL DEFAULT 50;
