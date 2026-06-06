# Sprint 15 — Pengeluaran Operasional & Margin Modal

> **Tanggal:** 6 Jun 2026 · **Owner:** Fajar (API), Dimas (Web), Rina (domain), Eko (algo margin)

## Ringkasan

Fitur keuangan retail untuk toko bahan bangunan (ADR-003):

| Fitur | Status |
|-------|--------|
| Model `Expense` + kategori OPERATIONAL / LOADING_UNLOADING / SHIPPING / OTHER | ✅ |
| API `GET/POST/PATCH /expenses` (Owner + Manager) | ✅ |
| `costPrice` RBAC — hanya Owner/Manager di API & master produk | ✅ |
| Peringatan margin negatif saat checkout (WARN, tidak block) | ✅ |
| `POST /transactions/validate-cart` untuk banner POS kasir | ✅ |
| Bundling: rollup modal komponen + UI `/master/bundles` | ✅ |
| Dashboard `/dashboard/expenses` | ✅ |

## Kategori Pengeluaran (Rina)

| Enum | Label UI |
|------|----------|
| `OPERATIONAL` | Onkos operasional |
| `LOADING_UNLOADING` | Bongkar muat |
| `SHIPPING` | Kirim barang |
| `OTHER` | Lainnya |

## RBAC

| Role | costPrice API/UI | Expenses | Margin warning POS |
|------|------------------|----------|----------------------|
| OWNER | ✅ | ✅ CRUD | ✅ (tanpa angka modal) |
| MANAGER | ✅ | ✅ CRUD | ✅ |
| CASHIER | ❌ | ❌ | ✅ |

## Algoritma Margin (Eko)

- Produk biasa: `sellPrice < costPrice` (cost > 0) → warning
- Bundle: effective cost = header `costPrice` jika > 0, else Σ(komponen.cost × qty)
- Checkout tetap **tidak diblokir** — flag `hasNegativeMargin` di response

## URL Web

- `/dashboard/expenses` — catat & riwayat pengeluaran
- `/master/products` — field modal (Owner/Manager)
- `/master/bundles` — daftar paket + rollup modal
- `/pos` — banner margin negatif di keranjang

## Migrasi

`20260606120000_operating_expenses`
