# Laporan Keuangan — Management Accounting MVP

> 📚 Indeks Dokumentasi · [INDEX.md](../INDEX.md) · Owner domain: **Rina** · Algoritma P&L: **Eko** · API: **Fajar** · UI: **Dimas**

---

## Ringkasan

Modul laporan keuangan standar untuk retail SMB Indonesia. Mendukung periode **harian, mingguan, bulanan, tahunan**, dan **rentang custom**. Filter outlet opsional (default agregat tenant).

## Laporan Standar

| Laporan | Isi | Endpoint |
|---------|-----|----------|
| **Laba Rugi (P&L)** | Penjualan, HPP/COGS, laba kotor, beban operasional, laba bersih | `GET /reports/finance/profit-loss` |
| **Piutang (AR)** | Outstanding, aging, penagihan periode, overdue | `GET /reports/finance/receivables` |
| **Utang (AP)** | Outstanding, pembayaran periode, overdue | `GET /reports/finance/payables` |
| **Arus Kas sederhana** | Kas masuk vs keluar | `GET /reports/finance/cash-flow` |
| **Ringkasan Harian** | Omzet, payment mix, piutang/utang baru | `GET /reports/finance/daily-summary` |

## Periode & Filter

| Parameter | Wajib | Keterangan |
|-----------|-------|------------|
| `period` | Tidak | `day` \| `week` \| `month` \| `year` — default `month` |
| `date` | Tidak | Tanggal acuan (WIB), default hari ini |
| `from` + `to` | Tidak | Rentang custom (override `period`) |
| `outletId` | Tidak | Filter cabang; kosong = seluruh tenant |

Kalender WIB (`Asia/Jakarta`). Batas periode: `[startUtc, endUtc)` — midnight WIB.

## Asumsi Perhitungan P&L (Eko)

```
Penjualan kotor   = Σ transaksi COMPLETED.total (completedAt dalam periode)
Void/refund       = Σ transaction_adjustments.amount (createdAt dalam periode, outlet scope)
Penjualan bersih  = Penjualan kotor − void/refund
HPP (COGS)        = Σ (line.qty × product.costPrice saat ini) untuk item transaksi periode
Laba kotor        = Penjualan bersih − HPP
Beban operasional = Σ expenses.amount (expenseDate dalam periode)
Laba bersih       = Laba kotor − Beban operasional
```

### Kebijakan Pendapatan

- **Penjualan CREDIT (tempo)** diakui sebagai pendapatan pada **tanggal transaksi** (completedAt), bukan saat pelunasan — selaras kebijakan piutang existing.
- Pelunasan piutang masuk **Arus Kas**, bukan penjualan ulang.

### HPP

- Menggunakan `product.costPrice` **saat laporan di-generate** (bukan snapshot historis di line item). MVP — dokumentasikan keterbatasan; Fase 3 bisa pakai cost snapshot per line.

## Piutang & Utang

| Metrik | Definisi |
|--------|----------|
| Outstanding | Σ (amount − paidAmount) status OPEN/PARTIAL per akhir periode |
| Baru periode | Invoice/utang `createdAt` dalam periode |
| Collections / Payments | Pembayaran `createdAt` dalam periode |
| Overdue | OPEN/PARTIAL dengan `dueDate < hari ini` |
| Aging | Bucket CURRENT, 0–30, 31–60, 61–90, 90+ hari |

## Arus Kas Sederhana

| Masuk | Keluar |
|-------|--------|
| Penjualan tunai (payment CASH) | Pembayaran utang supplier |
| Pelunasan piutang (semua metode) | Pengeluaran operasional |

Tidak termasuk: transfer non-tunai penjualan, deposit apply, koreksi shift.

## UI

- Route: `/dashboard/reports/finance`
- Tab: Laba Rugi | Piutang | Utang | Arus Kas | Ringkasan
- Cetak: `window.print()` + CSS `@media print`
- Export PDF: browser print-to-PDF (MVP)

## RBAC

| Role | Akses |
|------|-------|
| OWNER, MANAGER, ACCOUNTANT | Baca semua laporan keuangan |

## Handoff Log

| Field | Isi |
|-------|-----|
| **From** | Rina · Spesialis POS + Eko · Algorithm |
| **To** | Fajar · Senior Developer |
| **Task** | Spec laporan keuangan management accounting MVP |
| **Deliverable** | docs/domain/FINANCIAL-REPORTS.md |
| **Parallel OK?** | Ya — Fajar API parallel Dimas UI setelah contract freeze |
| **Next action** | Implement API + UI + tests |
