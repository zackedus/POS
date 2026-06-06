-- Catalog performance: composite index for POS grid filter path
CREATE INDEX "products_tenant_id_is_active_has_variants_category_id_idx"
ON "products"("tenant_id", "is_active", "has_variants", "category_id");

-- Category list sort path
CREATE INDEX "categories_tenant_id_sort_order_name_idx"
ON "categories"("tenant_id", "sort_order", "name");
