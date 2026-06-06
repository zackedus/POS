-- Add EXPIRED status for online orders past payment TTL
ALTER TYPE "OnlineOrderStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
