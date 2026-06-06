-- CreateIndex
CREATE INDEX "product_unit_conversions_tenant_id_product_id_is_purchase_u_idx" ON "product_unit_conversions"("tenant_id", "product_id", "is_purchase_unit");
