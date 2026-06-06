-- Outlet profile fields + tenant contact/logo stub
ALTER TABLE "outlets" ADD COLUMN "phone" TEXT;
ALTER TABLE "outlets" ADD COLUMN "operating_hours" TEXT;
ALTER TABLE "outlets" ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "tenants" ADD COLUMN "contact_phone" TEXT;
ALTER TABLE "tenants" ADD COLUMN "logo_url" TEXT;

-- Mark earliest active outlet per tenant as default (backfill)
UPDATE "outlets" AS o
SET "is_default" = true
FROM (
  SELECT DISTINCT ON ("tenant_id") "id"
  FROM "outlets"
  WHERE "is_active" = true
  ORDER BY "tenant_id", "created_at" ASC
) AS first_outlet
WHERE o."id" = first_outlet."id";
