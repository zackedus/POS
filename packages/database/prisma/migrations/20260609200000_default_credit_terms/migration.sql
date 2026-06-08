-- Default credit payment terms (7/14/30 days) for tempo checkout
ALTER TABLE "tenant_settings" ADD COLUMN "default_credit_terms_days" INTEGER NOT NULL DEFAULT 30;
