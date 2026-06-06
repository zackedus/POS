-- Sprint 7: outlet-level policy for bundle activation
CREATE TABLE "product_bundle_outlet_policies" (
  "id" TEXT NOT NULL,
  "bundle_id" TEXT NOT NULL,
  "outlet_id" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_bundle_outlet_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_bundle_outlet_policies_bundle_id_outlet_id_key"
ON "product_bundle_outlet_policies"("bundle_id", "outlet_id");

CREATE INDEX "product_bundle_outlet_policies_outlet_id_is_active_idx"
ON "product_bundle_outlet_policies"("outlet_id", "is_active");

ALTER TABLE "product_bundle_outlet_policies"
ADD CONSTRAINT "product_bundle_outlet_policies_bundle_id_fkey"
FOREIGN KEY ("bundle_id") REFERENCES "product_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_bundle_outlet_policies"
ADD CONSTRAINT "product_bundle_outlet_policies_outlet_id_fkey"
FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
