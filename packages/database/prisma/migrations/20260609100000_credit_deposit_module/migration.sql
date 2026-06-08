-- Credit, Receivables, Payables & Customer Deposits (Fase 2)

-- Extend payment methods
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CREDIT';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'DEPOSIT';

-- Customer credit limit
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "credit_limit" DECIMAL(15,2);

-- Enums
CREATE TYPE "ReceivableStatus" AS ENUM ('OPEN', 'PARTIAL', 'PAID', 'VOID');
CREATE TYPE "PayableStatus" AS ENUM ('OPEN', 'PARTIAL', 'PAID', 'VOID');
CREATE TYPE "DepositAccountStatus" AS ENUM ('ACTIVE', 'CLOSED');
CREATE TYPE "DepositTransactionType" AS ENUM ('TOP_UP', 'APPLY', 'REFUND');

-- Receivables (Piutang)
CREATE TABLE "receivables" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "outlet_id" TEXT,
    "transaction_id" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "paid_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "ReceivableStatus" NOT NULL DEFAULT 'OPEN',
    "due_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receivables_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "receivables_transaction_id_key" ON "receivables"("transaction_id");
CREATE INDEX "receivables_tenant_id_status_idx" ON "receivables"("tenant_id", "status");
CREATE INDEX "receivables_tenant_id_customer_id_idx" ON "receivables"("tenant_id", "customer_id");
CREATE INDEX "receivables_tenant_id_due_date_idx" ON "receivables"("tenant_id", "due_date");
CREATE INDEX "receivables_outlet_id_idx" ON "receivables"("outlet_id");

ALTER TABLE "receivables" ADD CONSTRAINT "receivables_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "receivable_payments" (
    "id" TEXT NOT NULL,
    "receivable_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "recorded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receivable_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "receivable_payments_receivable_id_created_at_idx" ON "receivable_payments"("receivable_id", "created_at");

ALTER TABLE "receivable_payments" ADD CONSTRAINT "receivable_payments_receivable_id_fkey" FOREIGN KEY ("receivable_id") REFERENCES "receivables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "receivable_payments" ADD CONSTRAINT "receivable_payments_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Payables (Utang)
CREATE TABLE "payables" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "po_id" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "paid_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "PayableStatus" NOT NULL DEFAULT 'OPEN',
    "due_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payables_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payables_po_id_key" ON "payables"("po_id");
CREATE INDEX "payables_tenant_id_status_idx" ON "payables"("tenant_id", "status");
CREATE INDEX "payables_tenant_id_supplier_id_idx" ON "payables"("tenant_id", "supplier_id");
CREATE INDEX "payables_tenant_id_due_date_idx" ON "payables"("tenant_id", "due_date");

ALTER TABLE "payables" ADD CONSTRAINT "payables_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payables" ADD CONSTRAINT "payables_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payables" ADD CONSTRAINT "payables_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "payable_payments" (
    "id" TEXT NOT NULL,
    "payable_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "recorded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payable_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payable_payments_payable_id_created_at_idx" ON "payable_payments"("payable_id", "created_at");

ALTER TABLE "payable_payments" ADD CONSTRAINT "payable_payments_payable_id_fkey" FOREIGN KEY ("payable_id") REFERENCES "payables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payable_payments" ADD CONSTRAINT "payable_payments_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Customer deposits
CREATE TABLE "customer_deposits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "DepositAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_deposits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_deposits_customer_id_key" ON "customer_deposits"("customer_id");
CREATE INDEX "customer_deposits_tenant_id_status_idx" ON "customer_deposits"("tenant_id", "status");

ALTER TABLE "customer_deposits" ADD CONSTRAINT "customer_deposits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_deposits" ADD CONSTRAINT "customer_deposits_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "deposit_transactions" (
    "id" TEXT NOT NULL,
    "deposit_id" TEXT NOT NULL,
    "type" "DepositTransactionType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "balance_after" DECIMAL(15,2) NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "notes" TEXT,
    "recorded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposit_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "deposit_transactions_deposit_id_created_at_idx" ON "deposit_transactions"("deposit_id", "created_at");
CREATE INDEX "deposit_transactions_reference_type_reference_id_idx" ON "deposit_transactions"("reference_type", "reference_id");

ALTER TABLE "deposit_transactions" ADD CONSTRAINT "deposit_transactions_deposit_id_fkey" FOREIGN KEY ("deposit_id") REFERENCES "customer_deposits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deposit_transactions" ADD CONSTRAINT "deposit_transactions_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
