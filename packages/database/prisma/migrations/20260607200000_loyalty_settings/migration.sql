-- Loyalty points MVP settings per tenant
ALTER TABLE "tenant_settings"
  ADD COLUMN IF NOT EXISTS "loyalty_points_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "loyalty_earn_rate_idr" INTEGER NOT NULL DEFAULT 10000;
