-- AlterTable
ALTER TABLE "delivery_orders" ADD COLUMN "online_order_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "delivery_orders_online_order_id_key" ON "delivery_orders"("online_order_id");

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_online_order_id_fkey" FOREIGN KEY ("online_order_id") REFERENCES "online_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
