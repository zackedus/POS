-- Add sales channel to online orders (WEB storefront vs marketplace MVP)
CREATE TYPE "OnlineOrderChannel" AS ENUM ('WEB', 'TOKOPEDIA', 'SHOPEE', 'OTHER');

ALTER TABLE "online_orders"
  ADD COLUMN "channel" "OnlineOrderChannel" NOT NULL DEFAULT 'WEB',
  ADD COLUMN "external_order_ref" TEXT;

CREATE INDEX "online_orders_tenant_id_channel_status_created_at_idx"
  ON "online_orders"("tenant_id", "channel", "status", "created_at");
