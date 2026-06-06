-- Sprint 5: fondasi varian produk (parent/child SKU)
ALTER TABLE "products" ADD COLUMN "parent_product_id" TEXT;
ALTER TABLE "products" ADD COLUMN "variant_label" TEXT;
ALTER TABLE "products" ADD COLUMN "has_variants" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "products_tenant_id_parent_product_id_idx" ON "products"("tenant_id", "parent_product_id");

ALTER TABLE "products" ADD CONSTRAINT "products_parent_product_id_fkey" FOREIGN KEY ("parent_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
