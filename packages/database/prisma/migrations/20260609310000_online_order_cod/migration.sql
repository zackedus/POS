-- CreateEnum
CREATE TYPE "OnlineOrderPaymentMode" AS ENUM ('FULL_ONLINE', 'COD');

-- AlterTable
ALTER TABLE "online_orders"
  ADD COLUMN "payment_mode" "OnlineOrderPaymentMode" NOT NULL DEFAULT 'FULL_ONLINE',
  ADD COLUMN "deposit_amount" DECIMAL(15,2),
  ADD COLUMN "balance_due" DECIMAL(15,2),
  ADD COLUMN "balance_collected_at" TIMESTAMP(3);
