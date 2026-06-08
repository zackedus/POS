# Modul Piutang, Utang & Deposit Pelanggan

> **Owner domain:** Rina · **Algoritma:** Eko · **API:** Fajar · **UI:** Dimas  
> **Scope:** Fase 2 retail SMB Indonesia (toko bahan bangunan)  
> **Keputusan multi-outlet:** AR/AP **tenant-level** untuk MVP; `Receivable.outletId` opsional untuk laporan per cabang.

---

## 1. Ringkasan Bisnis

| Modul | Istilah | Deskripsi |
|-------|---------|-----------|
| **AR** | Piutang | Tagihan pelanggan belum lunas (jual tempo/kredit) |
| **AP** | Utang | Hutang ke supplier/distributor belum dibayar |
| **Deposit** | Uang muka | Saldo hold pelanggan — top-up, apply checkout, refund |

---

## 2. Alur Operasional

### 2.1 Piutang (AR)

1. Kasir checkout dengan metode **Tempo/Piutang** (`PaymentMethod.CREDIT`) → otomatis buat `Receivable` terhubung transaksi.
2. Manager/akuntan lihat outstanding di `/dashboard/receivables`.
3. Pelunasan cicil/penuh via dashboard atau kasir (endpoint `POST /receivables/:id/payments`).
4. Void transaksi kredit → piutang terkait status `VOID`; deposit apply di-rollback via ledger `REFUND`.

**Aturan:**

- Wajib pelanggan terhubung untuk CREDIT/DEPOSIT.
- `creditLimit` di `Customer`: `null` = unlimited; `0` = tidak boleh tempo.
- Outstanding + nominal kredit baru ≤ `creditLimit` (jika limit diset).
- Ledger immutable — koreksi via payment record baru, bukan edit amount.

### 2.2 Utang (AP)

1. PO diterima (partial/full) → opsional buat utang via `POST /payables/from-po/:purchaseOrderId`.
2. Satu PO maksimal satu `Payable` (`poId` unique).
3. Pembayaran ke supplier: `POST /payables/:id/payments`.

### 2.3 Deposit Pelanggan

1. Top-up: `POST /deposits/top-up` (dashboard/kasir).
2. Apply checkout: metode `DEPOSIT` — saldo berkurang, ledger `APPLY`.
3. Refund sisa: `POST /deposits/customers/:id/refund` → ledger `REFUND`.
4. Tidak double-apply: unique constraint via cek `referenceType=transaction` + `type=APPLY`.

---

## 3. Model Data (Prisma)

| Tabel | Fungsi |
|-------|--------|
| `customers.credit_limit` | Limit kredit tempo per pelanggan |
| `receivables` | Header piutang |
| `receivable_payments` | Pembayaran piutang (immutable) |
| `payables` | Header utang supplier |
| `payable_payments` | Pembayaran utang |
| `customer_deposits` | Akun deposit (1:1 customer) |
| `deposit_transactions` | Ledger TOP_UP / APPLY / REFUND |

**Enum `PaymentMethod` extended:** `CREDIT`, `DEPOSIT`

---

## 4. API Endpoints

| Method | Route | RBAC |
|--------|-------|------|
| GET | `/receivables` | Owner, Manager, Accountant, Cashier (read) |
| GET | `/receivables/overdue` | Owner, Manager, Accountant |
| GET | `/receivables/aging` | Owner, Manager, Accountant |
| GET | `/receivables/customers/:id/statement?from=&to=` | Owner, Manager, Accountant, Cashier |
| GET | `/receivables/:id` | Owner, Manager, Accountant, Cashier |
| POST | `/receivables` | Owner, Manager, Accountant |
| POST | `/receivables/:id/payments` | Owner, Manager, Accountant, Cashier |
| GET | `/receivables/customers/:id/summary` | Owner, Manager, Accountant, Cashier |
| PATCH | `/receivables/customers/:id/credit-limit` | Owner, Manager |
| GET | `/finance/summary` | Owner, Manager, Accountant |
| POST | `/finance/overdue-reminders` | Owner, Manager (email stub — log console) |
| GET | `/payables` | Owner, Manager, Accountant (filter `outletId` via PO) |
| GET | `/payables/overdue` | Owner, Manager, Accountant |
| POST | `/payables` | Owner, Manager, Accountant |
| POST | `/payables/from-po/:poId` | Owner, Manager, Accountant |
| POST | `/payables/:id/payments` | Owner, Manager, Accountant |
| GET | `/deposits` | Owner, Manager, Accountant, Cashier |
| GET | `/deposits/customers/:id` | Owner, Manager, Accountant, Cashier |
| POST | `/deposits/top-up` | Owner, Manager, Accountant, Cashier |
| POST | `/deposits/customers/:id/refund` | Owner, Manager, Accountant |

**POS checkout (existing):**

- `POST /transactions/checkout-split` — supports `CREDIT` + `DEPOSIT` payment lines.

---

## 5. Frontend Routes

| Route | Halaman |
|-------|---------|
| `/dashboard/receivables` | Daftar piutang + catat pembayaran |
| `/dashboard/receivables/aging` | Laporan aging piutang + ekspor CSV |
| `/dashboard/receivables/statement/:customerId` | Statement piutang pelanggan (cetak HTML) |
| `/dashboard/payables` | Daftar utang supplier (filter outlet via PO) |
| `/dashboard/deposits` | Deposit pelanggan + top-up |
| `/dashboard` | Widget ringkasan keuangan (piutang, utang, deposit, kas) |
| `/pos` | Metode Tempo & Deposit di kasir + info limit kredit |

---

## 6. Error Codes

| Code | Kondisi |
|------|---------|
| `CREDIT_LIMIT_EXCEEDED` | Outstanding + kredit baru > limit |
| `CREDIT_NOT_ALLOWED` | creditLimit = 0 |
| `DEPOSIT_INSUFFICIENT_BALANCE` | Apply/refund melebihi saldo |
| `DEPOSIT_ALREADY_APPLIED` | Double apply ke transaksi |
| `FINANCE_CUSTOMER_REQUIRED` | CREDIT/DEPOSIT tanpa customer |
| `RECEIVABLE_NOT_OPEN` | Bayar piutang sudah lunas/void |
| `PAYABLE_NOT_OPEN` | Bayar utang sudah lunas/void |

---

## 7. Test Cases (Citra + Eko)

| ID | Skenario | Expected |
|----|----------|----------|
| BL-FIN-01 | Credit sale → partial pay → full pay | Status OPEN→PARTIAL→PAID, outstanding 0 |
| BL-FIN-02 | Deposit top-up → apply partial → refund | Ledger balance konsisten |
| BL-FIN-03 | PO receive → create payable → pay supplier | Payable PAID |
| BL-FIN-04 | Void transaksi kredit | Receivable VOID |
| BL-FIN-05 | Void transaksi deposit apply | Deposit REFUND ledger |
| BL-FIN-06 | Credit over limit | 422 CREDIT_LIMIT_EXCEEDED |
| BL-FIN-07 | Aging piutang bucket 0–30/31–60/61–90/90+ | Totals konsisten dengan outstanding |
| BL-FIN-08 | Customer statement periode | Opening + entries = closing; deposit balance tampil |
| BL-FIN-09 | Dashboard finance summary | Piutang/utang/deposit/kas hari ini match API |
| BL-FIN-10 | Overdue reminder stub | POST `/finance/overdue-reminders` log console (WA defer Fase 3) |

---

## 8. Deferred (Fase 3)

- Custom RBAC rules
- General ledger / jurnal double-entry penuh
- Multi-currency
- WhatsApp reminder otomatis (SMTP email penuh)

---

*Terakhir diperbarui: 9 Jun 2026 — P0 finance completion (aging, summary, statement, overdue UI)*
