# Integrasi Piutang (AR) & Utang (AP) — Barokah Core POS

> **Owner domain:** Rina · **API:** Fajar · **Frontend:** Dimas  
> **Tanggal:** 9 Jun 2026 · **Status:** Implemented (MVP unified hub)

---

## 1. Ringkasan Integrasi

Modul keuangan retail Barokah Core menghubungkan **piutang pelanggan**, **utang supplier**, **deposit**, dan **POS tempo** dalam satu hub terpadu tanpa menduplikasi halaman existing.

| Area | Route / Endpoint | Peran |
|------|------------------|-------|
| Finance Hub | `/dashboard/finance` | Kartu ringkasan AR/AP/net/deposit/kas + quick links |
| Piutang | `/dashboard/receivables` | List, filter, pelunasan, manual create |
| Aging AR | `/dashboard/receivables/aging` | Bucket overdue per pelanggan |
| Utang | `/dashboard/payables` | List supplier, bayar, link ke PO |
| Deposit | `/dashboard/deposits` | Saldo hold pelanggan |
| Summary API | `GET /api/v1/finance/summary` | Aggregasi tenant/outlet |

---

## 2. Titik Integrasi Piutang (AR)

### 2.1 Piutang ↔ Pelanggan (CRM)

| Arah | Mekanisme |
|------|-----------|
| CRM → AR | Tab **Piutang** di `/dashboard/customers/[id]` — finance-summary + payment history |
| AR → CRM | Link **Profil pelanggan** dari daftar piutang |
| Statement | `/dashboard/receivables/statement/[customerId]` — debit/kredit + saldo |

**API terkait:**
- `GET /customers/:id/finance-summary`
- `GET /receivables/customers/:id/payment-history`
- `GET /receivables/customers/:id/statement`

### 2.2 Piutang ↔ POS Tempo

| Event | Efek |
|-------|------|
| Checkout `PaymentMethod.CREDIT` | Auto-create `Receivable` terhubung `transactionId` |
| Checkout `DEPOSIT + CREDIT` | Kurangi deposit + buat piutang sisa |
| Void transaksi kredit | Receivable status `VOID` |
| POS panel pelanggan | Tampil piutang, deposit, limit — link ke dashboard CRM |

**Validasi:** `FinanceCheckoutService.assertCheckoutFinancePayments` — limit kredit, deposit balance, manager approval over-limit.

### 2.3 Piutang ↔ Riwayat Pembayaran ↔ Shift

| Konteks | Endpoint | Shift link |
|---------|----------|------------|
| Dashboard pelunasan | `POST /receivables/:id/payments` | `shiftId` opsional |
| POS pelunasan | `POST /receivables/customers/:id/payments` | Wajib shift aktif kasir |
| FIFO multi-invoice | `POST /receivables/customers/:id/payments` | Alokasi ke invoice tertua |

Pelunasan immutable di `receivable_payments` — metode CASH/TRANSFER/QRIS/DEPOSIT.

---

## 3. Titik Integrasi Utang (AP)

### 3.1 Utang ↔ Supplier ↔ PO

| Event | Efek |
|-------|------|
| PO receive (partial/full) | **Auto-create** `Payable` via `PayablesService.createFromPurchaseOrder` |
| Manual fallback | Tombol **Buat / Catat Utang** di PO detail jika auto gagal/legacy |
| Satu PO = satu Payable | Unique constraint `poId` |

**Amount utang:** Σ (qty received × unit cost) dari receipt lines; fallback ke `items.receivedQuantity × unitCost`.

### 3.2 Utang ↔ Pembayaran Supplier

| Aksi | Endpoint |
|------|----------|
| List utang | `GET /payables?status=&outletId=` |
| Catat bayar | `POST /payables/:id/payments` |
| Overdue filter | `GET /payables?status=OVERDUE` |

**Cross-link UI:**
- Payables → PO detail (`/dashboard/purchase-orders/[id]`)
- PO detail → Payables list + supplier
- Payables → filter PO per supplier

---

## 4. Laporan Silang (Cross-Reports)

### 4.1 Finance Summary (`GET /finance/summary`)

```json
{
  "receivablesOutstanding": 1300000,
  "receivablesOverdue": 3,
  "receivablesOverdueAmount": 450000,
  "payablesOutstanding": 800000,
  "payablesOverdue": 1,
  "payablesOverdueAmount": 200000,
  "depositsOutstanding": 350000,
  "cashToday": 2400000,
  "netPosition": 500000,
  "date": "2026-06-09",
  "outletId": "outlet-1"
}
```

| Field | Definisi |
|-------|----------|
| `netPosition` | Piutang outstanding − utang outstanding |
| `depositsOutstanding` | Total saldo deposit aktif (kewajiban toko) |
| `cashToday` | Pembayaran CASH transaksi COMPLETED hari ini (per outlet) |
| `receivablesOverdue` | Count piutang OPEN/PARTIAL dengan `dueDate < today` |
| `payablesOverdue` | Count utang OPEN/PARTIAL dengan `dueDate < today` |

### 4.2 Dampak Arus Kas

| Komponen | Arah kas | Catatan |
|----------|----------|---------|
| `cashToday` | Masuk | Real cash dari POS |
| Piutang outstanding | Aset (belum masuk kas) | Realisasi saat pelunasan |
| Utang outstanding | Kewajiban (belum keluar kas) | Realisasi saat bayar supplier |
| Deposit outstanding | Kewajiban | Uang pelanggan — bukan revenue |

**Dashboard home** dan **Finance Hub** menampilkan widget AR + AP + net position + banner overdue keduanya.

### 4.3 Komposisi Pembayaran Harian

`GET /reports/dashboard` → `pulse.paymentMix` sekarang include:
- `CREDIT` (Tempo/Piutang)
- `DEPOSIT` (Saldo deposit)

Selain CASH, TRANSFER, QRIS, E_WALLET, CARD.

---

## 5. Navigasi UI Terpadu

### Sidebar — Grup **Keuangan**

| Menu | Route |
|------|-------|
| Ringkasan Keuangan | `/dashboard/finance` |
| Piutang | `/dashboard/receivables` |
| Aging Piutang | `/dashboard/receivables/aging` |
| Utang | `/dashboard/payables` |
| Deposit | `/dashboard/deposits` |
| Pengeluaran | `/dashboard/expenses` |

### Admin Header Badge (Manager+)

Badge merah **N overdue** di header dashboard — link ke piutang jatuh tempo.

---

## 6. Diagram Alur Integrasi

```mermaid
flowchart TB
  subgraph POS
    Checkout[Checkout Tempo/Deposit]
    PayRecv[Terima Pembayaran Piutang]
  end

  subgraph AR
    Recv[Receivables]
    RecvPay[Receivable Payments]
    Aging[Aging Report]
  end

  subgraph AP
    PO[Purchase Order Receive]
    Pay[Payables]
    PaySup[Payable Payments]
  end

  subgraph Hub
    FinSum[GET /finance/summary]
    FinHub[/dashboard/finance]
  end

  subgraph CRM
    Cust[Customer Detail Tab Piutang]
  end

  Checkout --> Recv
  PayRecv --> RecvPay
  Recv --> FinSum
  Recv --> Aging
  Recv --> Cust
  Cust --> RecvPay

  PO -->|auto-create| Pay
  Pay --> PaySup
  Pay --> FinSum

  FinSum --> FinHub
  FinSum --> DashboardHome[Dashboard Home Widgets]
```

---

## 7. Gap Audit — Resolusi

| ID | Gap | Resolusi |
|----|-----|----------|
| FIX-1 | Payment mix tanpa CREDIT/DEPOSIT | `PAYMENT_METHOD_ORDER` extended di `ReportsService` |
| FIX-8 | PO detail tanpa link/buat utang | Section Utang Supplier + auto-create on receive |
| — | Finance summary tanpa net/AP overdue | Field `netPosition`, `payablesOverdue*` ditambah |
| — | Navigasi finance tersebar | Grup sidebar **Keuangan** + hub `/dashboard/finance` |

---

## 8. Referensi Terkait

- [CREDIT-DEPOSIT-MODULE.md](./CREDIT-DEPOSIT-MODULE.md) — spec modul AR/AP/deposit
- [RECEIVABLE-PAYMENT-FLOWS.md](./RECEIVABLE-PAYMENT-FLOWS.md) — alur pelunasan
- [FINANCE-ECONOMICS-POS.md](./FINANCE-ECONOMICS-POS.md) — domain ekonomi retail
- [PILOT-GO-LIVE-CHECKLIST.md](../manual/PILOT-GO-LIVE-CHECKLIST.md) — UAT unified finance

---

## Handoff Log

| Field | Isi |
|-------|-----|
| **From** | Rina · Spesialis POS Domain |
| **To** | Fitri · Documentation Specialist |
| **Task** | Index dokumen integrasi AR/AP |
| **Deliverable** | `docs/domain/FINANCE-AR-AP-INTEGRATION.md` |
| **Parallel OK?** | Ya — docs index update parallel |
| **Next action** | Tambah entry di `docs/INDEX.md` |
