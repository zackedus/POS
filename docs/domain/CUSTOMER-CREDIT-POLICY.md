# Kebijakan Kredit Pelanggan — Barokah Core POS

> Audience: Rina (domain), Eko (algoritma), Fajar (API), Dimas (UI)  
> Status: MVP — Juni 2026

## Ringkasan

Setiap pelanggan baru mendapat **limit kredit default Rp 1.000.000**. Limit dapat naik otomatis berdasarkan riwayat pembayaran piutang, atau di-override manual oleh Owner/Manager. Transaksi tempo yang melebihi limit **diblokir** kecuali ada **persetujuan manager** dengan audit trail lengkap.

---

## 1. Default Limit Baru

| Aturan | Nilai |
|--------|-------|
| Limit default pelanggan baru | **Rp 1.000.000** |
| Auto-increase aktif | `true` (default) |
| Semantik `creditLimit` | `null` = unlimited (override owner), `0` = tempo dilarang, `>0` = limit aktif |

Pelanggan dibuat via dashboard, POS (find-or-create), atau registrasi storefront member otomatis mendapat limit 1 jt dan entri audit `LIMIT_SET`.

---

## 2. Algoritma Auto-Increase (MVP)

**Trigger:** setelah pembayaran piutang (`ReceivablePayment`) yang mengubah status receivable.

**Prasyarat:**
- `autoLimitEnabled = true`
- `creditLimit != null` (bukan unlimited)
- **Zero overdue:** tidak ada receivable OPEN/PARTIAL dengan `dueDate < hari ini`

**Rumus:**
```
cumulativePaid = SUM(amount) dari receivable berstatus PAID
earnedSteps = floor(cumulativePaid / 10_000_000)
targetLimit = 1_000_000 + (earnedSteps × 500_000)
newLimit = min(targetLimit, 50_000_000)  // cap konfigurasi
```

**Contoh:**

| Total piutang lunas kumulatif | Limit otomatis |
|------------------------------|----------------|
| Rp 0 | Rp 1.000.000 |
| Rp 10.000.000 | Rp 1.500.000 |
| Rp 20.000.000 | Rp 2.000.000 |
| Rp 100.000.000+ | Rp 50.000.000 (cap) |

Setiap kenaikan dicatat di `CustomerCreditAuditLog` dengan action `LIMIT_AUTO_INCREASE`.

Owner/Manager dapat menonaktifkan auto-increase per pelanggan atau set limit manual (action `LIMIT_SET`).

---

## 3. Over-Limit Checkout

**Validasi saat checkout tempo (`PaymentMethod.CREDIT`):**

```
projectedOutstanding = outstandingReceivable + creditAmount
if projectedOutstanding > creditLimit → BLOKIR (CREDIT_LIMIT_EXCEEDED)
```

**Override manager:**

1. Kasir klik **Minta Persetujuan Manager**
2. Manager memasukkan email + password (re-auth) — **kasir tidak boleh approve transaksi sendiri**
3. API `POST /finance/credit-approval` mengeluarkan token 5 menit
4. Checkout dilanjutkan dengan `managerApprovalToken`
5. Audit log `OVER_LIMIT_APPROVAL` + `CREDIT_SALE` tercatat

Manager/Owner yang login sebagai kasir dapat self-approve (sama seperti void).

---

## 4. Immutability & Audit

Semua perubahan limit dan transaksi tempo tercatat di **`CustomerCreditAuditLog`**:

| Action | Kapan |
|--------|-------|
| `LIMIT_SET` | Create customer, PATCH limit manual |
| `LIMIT_AUTO_INCREASE` | Recalculate setelah bayar piutang |
| `OVER_LIMIT_APPROVAL` | Checkout tempo melebihi limit dengan token |
| `CREDIT_SALE` | Setiap checkout tempo (termasuk split payment) |

Field: `oldLimit`, `newLimit`, `amount`, `transactionId`, `approvedById`, `recordedById`, `notes`, `createdAt`.

Ledger **immutable** — tidak ada update/delete.

---

## 5. API Surface (MVP)

| Method | Route | Role |
|--------|-------|------|
| GET | `/customers?search=` | Kasir+ — picker daftar |
| GET | `/customers/lookup-by-code/:memberCode` | Kasir+ — scan QR |
| PATCH | `/customers/:id/credit-limit` | Owner, Manager |
| GET | `/customers/:id/credit-audit-log` | Owner, Manager, Kasir (read) |
| POST | `/finance/credit-approval` | Kasir+ (manager creds) |
| POST | `/transactions/checkout-split` | + optional `managerApprovalToken` |

---

## 6. UI POS

- **Picker pelanggan:** modal search dari daftar API
- **Scan member:** field QR/barcode `MBR-…`
- **Panel info:** limit, outstanding, kredit tersedia, deposit, poin
- **Over limit:** pesan blokir + tombol persetujuan manager

## 7. Dashboard

- Form create: tampilkan default 1 jt
- Detail pelanggan: edit limit, toggle auto-increase, tab **Riwayat Limit & Persetujuan**

---

## Referensi

- [CREDIT-DEPOSIT-MODULE.md](./CREDIT-DEPOSIT-MODULE.md)
- [CUSTOMER-MEMBER-CRM.md](./CUSTOMER-MEMBER-CRM.md)
- Konstanta: `packages/shared/src/constants/customer-credit.ts`
