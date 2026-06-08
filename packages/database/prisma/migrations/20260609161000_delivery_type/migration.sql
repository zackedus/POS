-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('STORE_DIRECT', 'ONLINE_ORDER');

-- AlterTable
ALTER TABLE "delivery_orders" ADD COLUMN "delivery_type" "DeliveryType" NOT NULL DEFAULT 'STORE_DIRECT';

-- CreateIndex
CREATE INDEX "delivery_orders_tenant_id_outlet_id_delivery_type_idx" ON "delivery_orders"("tenant_id", "outlet_id", "delivery_type");
