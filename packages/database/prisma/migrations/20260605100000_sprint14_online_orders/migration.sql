-- Sprint 14: Epic J online orders + product web catalog fields

-- Product web catalog extensions
ALTER TABLE "products" ADD COLUMN "sell_online" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN "image_url" TEXT;
ALTER TABLE "products" ADD COLUMN "web_placeholder_key" TEXT;
ALTER TABLE "products" ADD COLUMN "moq" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "products" ADD COLUMN "order_step" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "products_tenant_id_sell_online_is_active_idx" ON "products"("tenant_id", "sell_online", "is_active");

-- Stock movement reason for online sales
ALTER TYPE "StockMovementType" ADD VALUE 'SALE_ONLINE';

-- Online order enums
CREATE TYPE "OnlineOrderStatus" AS ENUM ('NEW', 'PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'READY', 'COMPLETED', 'CANCELLED');
CREATE TYPE "OnlineFulfillmentType" AS ENUM ('PICKUP', 'DELIVERY');
CREATE TYPE "OnlinePaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED');

-- Online orders
CREATE TABLE "online_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "order_no" TEXT NOT NULL,
    "client_request_id" TEXT NOT NULL,
    "status" "OnlineOrderStatus" NOT NULL DEFAULT 'NEW',
    "fulfillment_type" "OnlineFulfillmentType" NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "customer_notes" TEXT,
    "subtotal" DECIMAL(15,2) NOT NULL,
    "tax" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "shipping_fee" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL,
    "delivery_address" JSONB,
    "expires_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "midtrans_order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "online_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "online_order_items" (
    "id" TEXT NOT NULL,
    "online_order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "online_order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "online_order_payments" (
    "id" TEXT NOT NULL,
    "online_order_id" TEXT NOT NULL,
    "status" "OnlinePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(15,2) NOT NULL,
    "midtrans_transaction_id" TEXT,
    "payment_type" TEXT,
    "raw_notification" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "online_order_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "online_order_sequences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sequence_date" DATE NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "online_order_sequences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "online_orders_tenant_id_order_no_key" ON "online_orders"("tenant_id", "order_no");
CREATE UNIQUE INDEX "online_orders_tenant_id_client_request_id_key" ON "online_orders"("tenant_id", "client_request_id");
CREATE INDEX "online_orders_tenant_id_status_created_at_idx" ON "online_orders"("tenant_id", "status", "created_at");
CREATE INDEX "online_orders_outlet_id_status_created_at_idx" ON "online_orders"("outlet_id", "status", "created_at");

CREATE INDEX "online_order_items_online_order_id_idx" ON "online_order_items"("online_order_id");
CREATE UNIQUE INDEX "online_order_payments_midtrans_transaction_id_key" ON "online_order_payments"("midtrans_transaction_id");
CREATE INDEX "online_order_payments_online_order_id_idx" ON "online_order_payments"("online_order_id");
CREATE UNIQUE INDEX "online_order_sequences_tenant_id_sequence_date_key" ON "online_order_sequences"("tenant_id", "sequence_date");

ALTER TABLE "online_orders" ADD CONSTRAINT "online_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "online_orders" ADD CONSTRAINT "online_orders_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "online_order_items" ADD CONSTRAINT "online_order_items_online_order_id_fkey" FOREIGN KEY ("online_order_id") REFERENCES "online_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "online_order_items" ADD CONSTRAINT "online_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "online_order_payments" ADD CONSTRAINT "online_order_payments_online_order_id_fkey" FOREIGN KEY ("online_order_id") REFERENCES "online_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "online_order_sequences" ADD CONSTRAINT "online_order_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
