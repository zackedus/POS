# Piutang (AR) — Alur Bisnis End-to-End

> **Owner:** Rina · **Algoritma:** Eko · **API:** Fajar · **UI:** Dimas  
> **Tanggal audit:** 9 Jun 2026 · **Scope:** Retail bahan bangunan MVP

---

## Ringkasan Keputusan

| Topik | Keputusan MVP |
|-------|----------------|
| **Loyalty pada tempo** | Poin **dihitung saat checkout selesai** (sama seperti tunai/transfer), berdasarkan net spend setelah promo & redeem — **bukan** saat pelunasan piutang |
| **Jatuh tempo default** | Tenant settings: 7 / 14 / 30 hari (default **30**); kasir bisa override per transaksi |
| **Rekonsiliasi shift** | `expectedCash = opening + cashSales + arCashCollections − cashExpenses` |
| **Refund transaksi kredit** | Piutang dikurangi proporsional (partial) atau VOID jika belum ada pembayaran (full) |

---

## Tabel Alur 10 Langkah (PASS/FAIL)

| # | Langkah bisnis | Komponen | Status | Catatan verifikasi |
|---|----------------|----------|--------|-------------------|
| 1 | Set limit kredit pelanggan (default Rp 1 jt) + auto-increase | `Customer.creditLimit`, `CreditLimitService` | **PASS** | Pelanggan baru limit 1 jt; auto-increase setelah lunas kumulatif ≥ Rp 10 jt & zero overdue |
| 2 | POS: pilih pelanggan → checkout TEMPO → piutang + `dueDate` | `checkout-split`, `FinanceCheckoutService` | **PASS** | `creditTermsDays` 7/14/30 → `Receivable.dueDate` |
| 3 | Over limit → manager approval → piutang + audit | `POST /finance/credit-approval`, `CustomerCreditAuditLog` | **PASS** | Token 5 menit; action `OVER_LIMIT_APPROVAL` + `CREDIT_SALE` |
| 4 | Deposit partial + sisa tempo (split) | `DEPOSIT + CREDIT` payments | **PASS** | Deposit APPLY + receivable sisa |
| 5 | Dashboard: list piutang, aging, overdue banner | `/dashboard/receivables`, aging, finance hub | **PASS** | Filter `OVERDUE` pakai `dueDate < today` |
| 6 | Catat pembayaran: tunai/transfer/deposit → receipt print | `ReceivablePayment`, `PaymentReceiptService` | **PASS** | Immutable ledger + nomor bukti `REC-*` |
| 7 | POS: Terima Pembayaran Piutang → linked shift | `PosReceivablePaymentModal`, `shiftId` | **PASS** | CASH collections masuk rekonsiliasi shift |
| 8 | Void/refund transaction → piutang VOID atau adjusted | `reverseFinanceForVoid`, `reverseFinanceForRefund` | **PASS** | Void → VOID; refund partial → kurangi amount |
| 9 | Customer detail: tab piutang + payment history + statement | `/dashboard/customers/[id]`, statement route | **PASS** | Cross-link CRM ↔ AR |
| 10 | Reports: payment mix CREDIT; shift expected cash AR | `ReportsService`, `ShiftsService` | **PASS** | `paymentMix.CREDIT`; shift + AR cash − expenses |

---

## Gap Audit — Resolusi

| ID | Gap | Resolusi |
|----|-----|----------|
| P0-1 | `dueDate` tidak diset saat checkout tempo | Tenant default + POS picker + `creditTermsDays` DTO |
| P0-5/P0-6 | Shift recon tanpa pelunasan piutang tunai & pengeluaran | `computeShiftCashSummary` extended |
| FIX-4 | `dueDate` ke filter OVERDUE | Sudah ada; diverifikasi setelah P0-1 |
| FIX-5 | Refund tidak adjust piutang | `reverseFinanceForRefund` di checkout finance |
| FIX-1 | Payment mix tanpa CREDIT | Sudah extended di `ReportsService` |

---

## Referensi

- [CREDIT-DEPOSIT-MODULE.md](./CREDIT-DEPOSIT-MODULE.md)
- [CUSTOMER-CREDIT-POLICY.md](./CUSTOMER-CREDIT-POLICY.md)
- [RECEIVABLE-PAYMENT-FLOWS.md](./RECEIVABLE-PAYMENT-FLOWS.md)
- [FINANCE-AR-AP-INTEGRATION.md](./FINANCE-AR-AP-INTEGRATION.md)
- [PILOT-GO-LIVE-CHECKLIST.md](../manual/PILOT-GO-LIVE-CHECKLIST.md)

---

*Terakhir diperbarui: 9 Jun 2026 — E2E piutang completion sprint*
