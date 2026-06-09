-- Storefront settings hub: tenant profile fields + JSON config on tenant_settings
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "description" TEXT;

ALTER TABLE "tenant_settings" ADD COLUMN IF NOT EXISTS "storefront_settings" JSONB;
