-- Customer/Member CRM: addresses, member code, loyalty ledger

-- Extend customers
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "member_code" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "member_since" TIMESTAMPTZ;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "notes" TEXT;

UPDATE "customers"
SET "member_code" = 'MBR-' || UPPER(SUBSTRING(REPLACE("id"::text, '-', ''), 1, 8))
WHERE "member_code" IS NULL;

UPDATE "customers"
SET "member_since" = COALESCE("member_since", "created_at")
WHERE "member_since" IS NULL;

ALTER TABLE "customers" ALTER COLUMN "member_code" SET NOT NULL;
ALTER TABLE "customers" ALTER COLUMN "member_since" SET NOT NULL;
ALTER TABLE "customers" ALTER COLUMN "member_since" SET DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "customers_tenant_id_member_code_key"
  ON "customers"("tenant_id", "member_code");

-- Customer addresses
CREATE TABLE IF NOT EXISTS "customer_addresses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "customer_id" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "address_line1" TEXT NOT NULL,
  "address_line2" TEXT,
  "city" TEXT NOT NULL,
  "province" TEXT,
  "postal_code" TEXT,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_addresses_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "customer_addresses_customer_id_idx"
  ON "customer_addresses"("customer_id");

-- Loyalty point ledger
CREATE TYPE "LoyaltyPointType" AS ENUM ('EARN', 'REDEEM', 'ADJUST');

CREATE TABLE IF NOT EXISTS "loyalty_point_ledger" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "type" "LoyaltyPointType" NOT NULL,
  "points" INTEGER NOT NULL,
  "balance_after" INTEGER NOT NULL,
  "transaction_id" UUID,
  "notes" TEXT,
  "recorded_by_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "loyalty_point_ledger_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "loyalty_point_ledger_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "loyalty_point_ledger_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "loyalty_point_ledger_transaction_id_fkey"
    FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "loyalty_point_ledger_recorded_by_id_fkey"
    FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "loyalty_point_ledger_customer_id_created_at_idx"
  ON "loyalty_point_ledger"("customer_id", "created_at");
CREATE INDEX IF NOT EXISTS "loyalty_point_ledger_tenant_id_idx"
  ON "loyalty_point_ledger"("tenant_id");
