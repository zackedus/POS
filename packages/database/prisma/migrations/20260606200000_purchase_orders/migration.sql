-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "purchase_order_sequences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sequence_date" DATE NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "order_no" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "ordered_at" TIMESTAMP(3),
    "expected_delivery_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "submitted_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "unit_id" TEXT,
    "ordered_quantity" DECIMAL(15,3) NOT NULL,
    "received_quantity" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(15,2) NOT NULL,
    "line_total" DECIMAL(15,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_receipts" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_receipt_lines" (
    "id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "purchase_order_item_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity_received" DECIMAL(15,3) NOT NULL,
    "unit_cost" DECIMAL(15,2) NOT NULL,
    "base_quantity_added" DECIMAL(15,3) NOT NULL,
    "base_cost_applied" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "purchase_order_receipt_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_sequences_tenant_id_sequence_date_key" ON "purchase_order_sequences"("tenant_id", "sequence_date");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_tenant_id_order_no_key" ON "purchase_orders"("tenant_id", "order_no");

-- CreateIndex
CREATE INDEX "purchase_orders_tenant_id_outlet_id_status_idx" ON "purchase_orders"("tenant_id", "outlet_id", "status");

-- CreateIndex
CREATE INDEX "purchase_orders_tenant_id_supplier_id_idx" ON "purchase_orders"("tenant_id", "supplier_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_product_id_idx" ON "purchase_order_items"("product_id");

-- CreateIndex
CREATE INDEX "purchase_order_receipts_purchase_order_id_received_at_idx" ON "purchase_order_receipts"("purchase_order_id", "received_at");

-- CreateIndex
CREATE INDEX "purchase_order_receipt_lines_receipt_id_idx" ON "purchase_order_receipt_lines"("receipt_id");

-- CreateIndex
CREATE INDEX "purchase_order_receipt_lines_purchase_order_item_id_idx" ON "purchase_order_receipt_lines"("purchase_order_item_id");

-- AddForeignKey
ALTER TABLE "purchase_order_sequences" ADD CONSTRAINT "purchase_order_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_receipts" ADD CONSTRAINT "purchase_order_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_receipts" ADD CONSTRAINT "purchase_order_receipts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_receipt_lines" ADD CONSTRAINT "purchase_order_receipt_lines_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "purchase_order_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_receipt_lines" ADD CONSTRAINT "purchase_order_receipt_lines_purchase_order_item_id_fkey" FOREIGN KEY ("purchase_order_item_id") REFERENCES "purchase_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_receipt_lines" ADD CONSTRAINT "purchase_order_receipt_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
