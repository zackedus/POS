-- Storefront customer password auth (web store login)
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "password_hash" TEXT;
