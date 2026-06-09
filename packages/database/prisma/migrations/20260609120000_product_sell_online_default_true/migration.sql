-- New products default to visible on web store catalog.
ALTER TABLE "products" ALTER COLUMN "sell_online" SET DEFAULT true;
