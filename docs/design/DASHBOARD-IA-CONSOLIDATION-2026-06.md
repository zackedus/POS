# Dashboard IA Consolidation — Juni 2026

> **Auditor:** Maya Anggraini (UI/UX) + Rina Wulandari (POS Domain)  
> **Implementasi P0:** Dimas Pratama (Senior Frontend)  
> **Tanggal:** 9 Juni 2026  
> **Konteks:** Retail bahan bangunan — admin dashboard terlalu banyak item sidebar (28+ link), alur operasional terfragmentasi.

## Ringkasan Eksekutif

Dashboard admin saat ini punya **40+ route** di bawah `apps/web/src/app/dashboard/` plus master routes `/master/*`. Sidebar menampilkan **5 grup / 28 item** — terlalu dalam untuk kasir-shift panjang dan owner yang butuh navigasi cepat.

**Tujuan Pak Zaki:** lebih sedikit klik, alur bisnis lebih jelas.  
**Solusi P0:** hub tab untuk Keuangan, Pengaturan+Integrasi, Pengguna+Peran; sidebar dikonsolidasi ke **7 grup**.

---

## Inventaris Route (Audit Lengkap)

### Dashboard core

| Route | Label UI | Grup bisnis |
|-------|----------|-------------|
| `/dashboard` | Ringkasan | Operasional harian |
| `/dashboard/analytics` | Analitik | Laporan |
| `/dashboard/transactions` | Void & Struk | Operasional harian |
| `/dashboard/deliveries` | Pengiriman | Operasional harian |
| `/dashboard/online-orders` | Kelola Pesanan Web | Penjualan & pelanggan |
| `/dashboard/inventory` | Stok | Inventori & gudang |
| `/dashboard/stock` | (alias → inventory) | Inventori & gudang |
| `/dashboard/purchase-orders/*` | Order Distributor | Pembelian |
| `/dashboard/finance` | Keuangan (hub) | Keuangan |
| `/dashboard/receivables` | Piutang | Keuangan |
| `/dashboard/receivables/aging` | Aging Piutang | Keuangan |
| `/dashboard/receivables/statement/[id]` | Statement pelanggan | Keuangan (detail) |
| `/dashboard/payables` | Utang | Keuangan |
| `/dashboard/deposits` | Deposit | Keuangan |
| `/dashboard/expenses` | Pengeluaran | Keuangan |
| `/dashboard/customers` | Member & Pelanggan | Penjualan & pelanggan |
| `/dashboard/customers/[id]` | Detail pelanggan | Penjualan (detail — OK) |
| `/dashboard/promotions` | Promo & Diskon | Master & katalog |
| `/dashboard/units` | Satuan | Master & katalog |
| `/dashboard/products` | (redirect → master) | Master & katalog |
| `/dashboard/reports` | Laporan | Laporan |
| `/dashboard/admin` | Pusat Admin | Organisasi (hub duplikat) |
| `/dashboard/users` | Pengguna | Organisasi |
| `/dashboard/roles` | Peran & Izin | Organisasi |
| `/dashboard/integrations` | Integrasi & API | Organisasi |
| `/dashboard/settings` | Pengaturan Aplikasi | Organisasi |
| `/dashboard/store` | Profil Toko | Organisasi |
| `/dashboard/outlets` | Cabang | Organisasi |

### Master routes (sidebar)

| Route | Label |
|-------|-------|
| `/master/products` | Produk |
| `/master/bundles` | Paket Bundling |
| `/master/categories` | Kategori |

### Operasional di luar dashboard layout

| Route | Label |
|-------|-------|
| `/pos` | Kasir |
| `/pos/online-orders` | Order Online (kasir) |
| `/shift/open` | Buka Shift |
| `/shift/close` | Tutup Shift |

---

## Pemetaan Alur Bisnis (Retail Bahan Bangunan)

### 1. Operasional harian
Shift → kasir → void/struk → pengiriman order.  
**Pages:** `/dashboard`, `/pos`, `/shift/*`, `/dashboard/transactions`, `/dashboard/deliveries`, `/pos/online-orders`

### 2. Master & katalog
Produk, kategori, satuan, bundling, promo sebelum jual.  
**Pages:** `/master/products`, `/master/categories`, `/master/bundles`, `/dashboard/units`, `/dashboard/promotions`

### 3. Inventori & gudang
Stok outlet, opname, transfer antar cabang.  
**Pages:** `/dashboard/inventory`, `/dashboard/stock` (alias)

### 4. Pembelian
PO distributor → terima barang → utang supplier.  
**Pages:** `/dashboard/purchase-orders/*`, `/dashboard/payables` (post-PO)

### 5. Penjualan & pelanggan
Member, piutang tempo, deposit, pesanan web.  
**Pages:** `/dashboard/customers/*`, `/dashboard/online-orders`, `/dashboard/receivables/*`, `/dashboard/deposits`

### 6. Keuangan
AR/AP, aging, deposit liability, pengeluaran operasional, ringkasan kas.  
**Pages:** `/dashboard/finance`, `/dashboard/receivables*`, `/dashboard/payables`, `/dashboard/deposits`, `/dashboard/expenses`

### 7. Organisasi
Cabang, staff, role, pengaturan tenant, integrasi payment.  
**Pages:** `/dashboard/outlets`, `/dashboard/users`, `/dashboard/roles`, `/dashboard/settings`, `/dashboard/integrations`, `/dashboard/store`, `/dashboard/admin`

### 8. Laporan
Analitik dan laporan terstruktur.  
**Pages:** `/dashboard/analytics`, `/dashboard/reports`

---

## Proposal Konsolidasi

| Current pages | Proposed | Rationale | Priority |
|---------------|----------|-----------|----------|
| `/dashboard/finance` + `/receivables` + `/receivables/aging` + `/payables` + `/deposits` + `/expenses` | **`/dashboard/finance?tab=`** — Ringkasan \| Piutang \| Utang \| Aging \| Deposit \| Pengeluaran | Satu hub AR/AP; kurangi 5 item sidebar; alur owner cek kas → drill piutang tanpa pindah halaman | **P0** |
| `/dashboard/receivables/statement/[id]` | **Tetap** (detail cetak) | Workflow statement butuh URL bookmarkable & print | P1 — keep |
| `/dashboard/integrations` | **Tab Integrasi** di `/dashboard/settings?tab=integrasi` | Webhook Midtrans sudah duplikat info dengan tab Pembayaran; satu tempat konfigurasi tenant | **P0** |
| `/dashboard/roles` | **Tab Peran & Izin** di `/dashboard/users?tab=roles` | RBAC matrix + assign user = satu modul organisasi | **P0** |
| `/dashboard/admin` | **Hapus dari sidebar**; link internal dari Ringkasan jika perlu | Duplikat hub — semua tile sudah ada di sidebar Organisasi | P1 |
| `/dashboard/store` + tab Toko di settings | **Tetap terpisah** (P1 merge) | Profil toko = marketing-facing; settings = konfigurasi teknis — merge bisa membingungkan | P2 |
| `/dashboard/outlets` | **Tetap** under Organisasi | Multi-cabang = entitas operasional, bukan sekadar setting | P2 — keep |
| `/dashboard/customers` list + `[id]` detail tabs | **Tetap** | Pattern sudah benar (list → detail tabs profil/piutang/deposit) | OK |
| `/dashboard/stock` | **Redirect** ke inventory (sudah ada) | Alias backward-compat | OK |
| `/dashboard/analytics` + `/dashboard/reports` | **Grup Laporan** sidebar (P1) | Dua entry terkait — bisa hub `/dashboard/reports` nanti | P2 |
| `/pos/online-orders` + `/dashboard/online-orders` | **Tetap dua entry** (kasir vs admin) | Role berbeda — kasir fulfillment vs manager kelola | P2 |
| Master `/master/*` vs `/dashboard/units` | **P1:** pindah units ke `/master/units` only | Satu grup Katalog; units sudah punya redirect partial | P2 |

---

## Sidebar Target (7 Grup, P0)

| # | Grup | Items |
|---|------|-------|
| 1 | **Beranda** | Ringkasan, Analitik |
| 2 | **Operasional** | Kasir, Buka Shift, Tutup Shift, Void & Struk, Pengiriman, Pesanan Web |
| 3 | **Inventori & Pembelian** | Stok, Order Distributor |
| 4 | **Keuangan** | Keuangan *(hub tab)* |
| 5 | **Katalog** | Produk, Bundling, Kategori, Promo, Satuan |
| 6 | **Pelanggan** | Member & Pelanggan |
| 7 | **Organisasi** | Pengaturan, Pengguna, Cabang, Profil Toko |

**Dihapus dari sidebar (P0):** Piutang, Aging, Utang, Deposit, Pengeluaran, Peran & Izin, Integrasi, Pusat Admin.

---

## Redirect Map (Bookmark-safe)

| Old URL | New URL |
|---------|---------|
| `/dashboard/receivables` | `/dashboard/finance?tab=piutang` |
| `/dashboard/receivables?status=OVERDUE` | `/dashboard/finance?tab=piutang&status=OVERDUE` |
| `/dashboard/receivables/aging` | `/dashboard/finance?tab=aging` |
| `/dashboard/payables` | `/dashboard/finance?tab=utang` |
| `/dashboard/deposits` | `/dashboard/finance?tab=deposit` |
| `/dashboard/expenses` | `/dashboard/finance?tab=pengeluaran` |
| `/dashboard/integrations` | `/dashboard/settings?tab=integrasi` |
| `/dashboard/roles` | `/dashboard/users?tab=roles` |

Detail routes **tidak diubah:** `/dashboard/receivables/statement/[customerId]`, `/dashboard/customers/[id]`, `/dashboard/purchase-orders/[id]/*`.

---

## Handoff Log

| Field | Isi |
|-------|-----|
| **From** | Maya · UI/UX + Rina · POS Domain |
| **To** | Dimas · Senior Frontend |
| **Task** | Implement P0 merges + sidebar 7 grup |
| **Deliverable** | Doc ini + PR implementasi |
| **Parallel OK?** | Ya — backend tidak berubah |
| **Next action** | Dimas: tab finance/settings/users + redirect + update PILOT checklist |

---

## Acceptance Criteria (P0)

- [ ] Sidebar maks **7 grup**, total item ≤ 22
- [ ] Finance hub 6 tab berfungsi; old finance URLs redirect
- [ ] Settings tab Integrasi; `/dashboard/integrations` redirect
- [ ] Users tab Peran; `/dashboard/roles` redirect
- [ ] Label Bahasa Indonesia di AdminLayout
- [ ] `npm run lint && typecheck && test` PASS
- [ ] PILOT-GO-LIVE-CHECKLIST URLs diperbarui
