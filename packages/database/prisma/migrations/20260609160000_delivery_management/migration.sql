-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('MENUNGGU', 'DISIAPKAN', 'DIKIRIM', 'SELESAI', 'BATAL');

-- CreateTable
CREATE TABLE "delivery_order_sequences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sequence_date" DATE NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "delivery_order_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "delivery_no" TEXT NOT NULL,
    "transaction_id" TEXT,
    "customer_id" TEXT NOT NULL,
    "address_id" TEXT,
    "address_label" TEXT NOT NULL,
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "address_city" TEXT NOT NULL,
    "address_province" TEXT,
    "address_postal_code" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'MENUNGGU',
    "scheduled_at" TIMESTAMP(3),
    "driver_name" TEXT,
    "notes" TEXT,
    "cancel_reason" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_status_logs" (
    "id" TEXT NOT NULL,
    "delivery_order_id" TEXT NOT NULL,
    "from_status" "DeliveryStatus",
    "to_status" "DeliveryStatus" NOT NULL,
    "notes" TEXT,
    "changed_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_order_sequences_tenant_id_sequence_date_key" ON "delivery_order_sequences"("tenant_id", "sequence_date");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_orders_tenant_id_delivery_no_key" ON "delivery_orders"("tenant_id", "delivery_no");

-- CreateIndex
CREATE INDEX "delivery_orders_tenant_id_outlet_id_status_idx" ON "delivery_orders"("tenant_id", "outlet_id", "status");

-- CreateIndex
CREATE INDEX "delivery_orders_outlet_id_created_at_idx" ON "delivery_orders"("outlet_id", "created_at");

-- CreateIndex
CREATE INDEX "delivery_orders_transaction_id_idx" ON "delivery_orders"("transaction_id");

-- CreateIndex
CREATE INDEX "delivery_status_logs_delivery_order_id_created_at_idx" ON "delivery_status_logs"("delivery_order_id", "created_at");

-- AddForeignKey
ALTER TABLE "delivery_order_sequences" ADD CONSTRAINT "delivery_order_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "customer_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_status_logs" ADD CONSTRAINT "delivery_status_logs_delivery_order_id_fkey" FOREIGN KEY ("delivery_order_id") REFERENCES "delivery_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_status_logs" ADD CONSTRAINT "delivery_status_logs_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
