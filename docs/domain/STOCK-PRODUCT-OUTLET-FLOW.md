# Alur Bisnis — Stok, Produk, dan Cabang

> **Maintainer:** Rina (domain) · Fajar (API) · Dimas (UI)  
> **Versi:** 1.0 · 6 Juni 2026  
> **Scope:** Retail bahan bangunan SMB — multi-outlet, stok per cabang

---

## 1. Manajemen Stok (Inventory)

**UI:** `/dashboard/inventory` (alias `/dashboard/stock` → redirect)  
**API:** `GET/POST/PATCH /inventory`, `GET /inventory/movements`, `POST /inventory/opname`

```
┌─────────────────────────────────────────────────────────────────┐
│                    MANAJEMEN STOK PER CABANG                     │
└─────────────────────────────────────────────────────────────────┘

Owner/Manager pilih cabang (header) ──► GET /inventory?outletId=
        │
        ├──► Daftar stok (filter: kategori, search, stok rendah)
        │         └── minStock inline → PATCH /inventory/:id/min-stock
        │
        ├──► Stok masuk manual ──► POST /inventory/adjust (IN)
        │         Alasan: hadiah, transfer masuk, lainnya
        │         Mutasi: ADJUSTMENT | TRANSFER_IN
        │
        ├──► Stok keluar manual ──► POST /inventory/adjust (OUT)
        │         Alasan: rusak, sample, transfer keluar
        │         Mutasi: ADJUSTMENT | TRANSFER_OUT
        │
        ├──► Opname fisik ──► POST /inventory/opname
        │         Input qty aktual → selisih otomatis
        │         Mutasi: OPNAME
        │
        ├──► Stok masuk PO ──► POST /purchase-orders/:id/receive
        │         Mutasi: PURCHASE (modul supplier)
        │
        ├──► Stok keluar penjualan ──► checkout POS / online
        │         Mutasi: SALE | SALE_ONLINE
        │
        └──► Riwayat mutasi ──► GET /inventory/movements?outletId=

Catatan multi-satuan: semua qty disimpan dalam **satuan dasar** (kg, sak, liter).
UI menampilkan ekuivalen satuan beli (dus) jika konversi ada.
```

| Peran | Akses |
|-------|-------|
| Owner | Full — semua cabang tenant |
| Manager | Full — cabang assigned saja |
| Kasir | Tidak akses dashboard stok |
| INVENTORY role | Read-only list stok |

---

## 2. Manajemen Produk

**UI:** `/master/products`  
**API:** `GET/POST/PATCH/DELETE /products`, `POST /inventory/adjust` (stok awal)

```
┌─────────────────────────────────────────────────────────────────┐
│                      MASTER PRODUK (TENANT)                      │
└─────────────────────────────────────────────────────────────────┘

Wizard create (SIMPLE | MULTI_UNIT | VARIANT)
        │
        ├── Info dasar: SKU, nama, kategori, sellOnline, gambar
        ├── Tipe produk: sederhana / multi-satuan / induk varian
        ├── Satuan & harga (+ konversi / draft varian)
        └── Stok awal (opsional, cabang aktif di header)
                  └── POST /inventory/adjust (stok awal)

List produk
        ├── Filter: search, kategori, tipe, tampilkan nonaktif
        ├── Badge: stok rendah (cabang aktif), status nonaktif
        ├── Nonaktifkan ──► PATCH /products/:id { isActive: false }
        │         (hilang dari grid kasir, stok tetap ada)
        └── Kelola varian ──► panel varian + stok per SKU

Katalog kasir (GET /products/grid)
        └── Hanya isActive=true, hasVariants=false
```

| Tipe | Stok | POS |
|------|------|-----|
| Sederhana | 1 SKU = 1 inventory row | Langsung di grid |
| Multi-satuan | Stok base unit; jual pakai konversi | Grid + pilih satuan jual |
| Induk varian | Tidak distok (parent) | Tidak di grid |
| SKU varian | Stok per anak | Masing-masing di grid |

---

## 3. Manajemen Cabang (Outlet)

**UI:** `/dashboard/outlets` (CRUD Owner), `/dashboard/settings` (read-only profil)  
**API:** `GET/POST/PATCH /outlets`, `GET /reports/outlets` (picker operasional)

```
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-OUTLET PER TENANT                       │
└─────────────────────────────────────────────────────────────────┘

Owner
        ├── GET /outlets?includeInactive=true
        ├── POST /outlets { name, code, address }
        ├── PATCH /outlets/:id { name, code, address, isActive }
        └── Auto-assign UserOutlet ke owner saat create

Manager
        ├── GET /outlets (cabang assigned, aktif saja)
        └── Switch cabang di header → localStorage + state global

Kasir
        └── outletIds dari JWT (UserOutlet) — POS pakai shift outlet

Data ter-scope outletId:
        ├── inventory_items (stok snapshot)
        ├── stock_movements (ledger)
        ├── shifts, transactions, purchase_orders
        └── reports (filter outletId wajib jika >1 cabang)

Assign user ke cabang:
        └── /dashboard/users (Owner) → outletIds[]
```

---

## Integrasi Antar Domain

```
Cabang dipilih ──► Stok list / PO / Laporan / Stok awal produk
Produk nonaktif ──► Hilang dari grid kasir & storefront (sellOnline)
Produk aktif + stok ──► POS validasi stok per outlet shift
PO receive ──► Stok masuk + HPP update (lihat DISTRIBUTOR-ORDER-FLOW.md)
```

---

## Deferred (Fase 2+)

- Transfer antar cabang dengan dokumen approval (enum sudah ada, UI manual adjust saat ini)
- Notifikasi WA/email stok minimum
- Opname batch / scan barcode
- Aggregate stok semua cabang di satu dashboard

---

## Referensi

- [DISTRIBUTOR-ORDER-FLOW.md](./DISTRIBUTOR-ORDER-FLOW.md)
- [PRODUCT-UNIT-VARIANT-MODEL.md](./PRODUCT-UNIT-VARIANT-MODEL.md)
- [FEATURE-BACKLOG.md](../requirements/FEATURE-BACKLOG.md)
