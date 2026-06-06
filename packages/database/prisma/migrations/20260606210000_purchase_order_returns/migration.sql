-- AlterEnum
ALTER TYPE "StockMovementType" ADD VALUE 'PURCHASE_RETURN';

-- CreateEnum
CREATE TYPE "PurchaseOrderReturnReason" AS ENUM ('DAMAGED', 'WRONG_ITEM', 'EXCESS', 'OTHER');

-- CreateEnum
CREATE TYPE "PurchaseOrderReturnStatus" AS ENUM ('COMPLETED');

-- AlterTable
ALTER TABLE "purchase_order_items" ADD COLUMN "returned_quantity" DECIMAL(15,3) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "purchase_order_return_sequences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sequence_date" DATE NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_return_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_returns" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "return_no" TEXT NOT NULL,
    "status" "PurchaseOrderReturnStatus" NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "returned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_return_lines" (
    "id" TEXT NOT NULL,
    "return_id" TEXT NOT NULL,
    "purchase_order_item_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity_returned" DECIMAL(15,3) NOT NULL,
    "reason" "PurchaseOrderReturnReason" NOT NULL,
    "base_quantity_removed" DECIMAL(15,3) NOT NULL,
    "unit_cost" DECIMAL(15,2) NOT NULL,
    "line_total" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "purchase_order_return_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_return_sequences_tenant_id_sequence_date_key" ON "purchase_order_return_sequences"("tenant_id", "sequence_date");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_returns_tenant_id_return_no_key" ON "purchase_order_returns"("tenant_id", "return_no");

-- CreateIndex
CREATE INDEX "purchase_order_returns_purchase_order_id_returned_at_idx" ON "purchase_order_returns"("purchase_order_id", "returned_at");

-- CreateIndex
CREATE INDEX "purchase_order_return_lines_return_id_idx" ON "purchase_order_return_lines"("return_id");

-- CreateIndex
CREATE INDEX "purchase_order_return_lines_purchase_order_item_id_idx" ON "purchase_order_return_lines"("purchase_order_item_id");

-- AddForeignKey
ALTER TABLE "purchase_order_return_sequences" ADD CONSTRAINT "purchase_order_return_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_returns" ADD CONSTRAINT "purchase_order_returns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_returns" ADD CONSTRAINT "purchase_order_returns_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_returns" ADD CONSTRAINT "purchase_order_returns_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_return_lines" ADD CONSTRAINT "purchase_order_return_lines_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "purchase_order_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_return_lines" ADD CONSTRAINT "purchase_order_return_lines_purchase_order_item_id_fkey" FOREIGN KEY ("purchase_order_item_id") REFERENCES "purchase_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_return_lines" ADD CONSTRAINT "purchase_order_return_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
