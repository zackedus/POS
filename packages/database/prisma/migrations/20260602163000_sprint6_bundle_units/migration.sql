-- Sprint 6: bundle rules + multi-unit conversion baseline
CREATE TABLE "product_bundles" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "bundle_product_id" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_bundles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_bundle_items" (
  "id" TEXT NOT NULL,
  "bundle_id" TEXT NOT NULL,
  "component_product_id" TEXT NOT NULL,
  "quantity" DECIMAL(15,3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_bundle_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_unit_conversions" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "sell_unit_id" TEXT NOT NULL,
  "conversion_to_base" DECIMAL(15,3) NOT NULL,
  "is_default_sell" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_unit_conversions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_bundles_bundle_product_id_key" ON "product_bundles"("bundle_product_id");
CREATE INDEX "product_bundles_tenant_id_is_active_idx" ON "product_bundles"("tenant_id", "is_active");
CREATE UNIQUE INDEX "product_bundle_items_bundle_id_component_product_id_key" ON "product_bundle_items"("bundle_id", "component_product_id");
CREATE INDEX "product_bundle_items_component_product_id_idx" ON "product_bundle_items"("component_product_id");
CREATE UNIQUE INDEX "product_unit_conversions_product_id_sell_unit_id_key" ON "product_unit_conversions"("product_id", "sell_unit_id");
CREATE INDEX "product_unit_conversions_tenant_id_product_id_is_default_sell_idx" ON "product_unit_conversions"("tenant_id", "product_id", "is_default_sell");

ALTER TABLE "product_bundles"
ADD CONSTRAINT "product_bundles_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_bundles"
ADD CONSTRAINT "product_bundles_bundle_product_id_fkey"
FOREIGN KEY ("bundle_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_bundle_items"
ADD CONSTRAINT "product_bundle_items_bundle_id_fkey"
FOREIGN KEY ("bundle_id") REFERENCES "product_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_bundle_items"
ADD CONSTRAINT "product_bundle_items_component_product_id_fkey"
FOREIGN KEY ("component_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_unit_conversions"
ADD CONSTRAINT "product_unit_conversions_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_unit_conversions"
ADD CONSTRAINT "product_unit_conversions_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_unit_conversions"
ADD CONSTRAINT "product_unit_conversions_sell_unit_id_fkey"
FOREIGN KEY ("sell_unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
