> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Sprint | Audience: Pak Zaki, Hendra, Fajar, Dimas, Fitri

# Sprint 5 — Progress Report

> **Tanggal update:** 2 Juni 2026 (frontend + docs final — jalur paralel)  
> **Orchestrator:** Budi Santoso (CEO)  
> **Referensi:** [SPRINT-5-PLAN.md](../requirements/SPRINT-5-PLAN.md), [SPRINT-4-CLOSURE.md](./SPRINT-4-CLOSURE.md)

---

## Status Ringkas

- **Progress Sprint 5:** **100%**
- **Progress frontend:** **100%**
- **Status:** **CLOSED**
- **Scope aman:** tetap retail bahan bangunan + stack React/Next + NestJS/Prisma, tanpa F&B/meja/KDS.

---

## Implementasi Selesai

### 1) Product Variant Foundation (Prioritas Sprint 5)

- [x] Menambah fondasi varian di schema produk:
  - `hasVariants`
  - `parentProductId`
  - `variantLabel`
- [x] Menambah validasi katalog:
  - produk induk tidak boleh sekaligus punya parent
  - label varian hanya untuk produk turunan
  - parent product wajib valid saat dipilih
- [x] Menambah relasi parent/child produk agar daftar master bisa menunjukkan turunan varian.

### 2) Guard Operasional Transaksi

- [x] Product grid hanya menampilkan SKU yang bisa dijual langsung (produk induk varian dikecualikan).
- [x] Checkout split menolak produk induk varian (`INVALID_INPUT`).
- [x] Hold transaksi menolak produk induk varian (`INVALID_INPUT`).

### 3) UI Master Produk

- [x] Tambah opsi checkbox produk induk varian.
- [x] Tambah dropdown parent product untuk produk turunan.
- [x] Tambah input label varian dan tampilkan badge info varian di list.

### 4) Testing

- [x] Tambah test backend katalog untuk validasi varian.
- [x] Tambah test backend transaksi untuk menolak produk induk varian pada checkout.
- [x] Tambah test `holdTransaction` menolak produk induk varian.
- [x] Tambah test `listProductsGrid` memfilter `hasVariants: false`.
- [x] Tambah test katalog: `variantLabel` tanpa `parentProductId` ditolak.
- [x] Tambah test frontend `apps/web/src/app/master/products/page.test.tsx` (konteks list varian + kontrol form).

### 5) Database & Seed (Backend)

- [x] Migrasi `20260602000000_product_variants` — kolom `parent_product_id`, `variant_label`, `has_variants` + FK + index.
- [x] `prisma migrate deploy` diterapkan di dev (`localhost:5432`).
- [x] Seed contoh varian bahan bangunan:
  - Induk: `CAT-PARENT` (`hasVariants: true`, harga 0 — tidak dijual langsung)
  - Turunan: `CAT-5L`, `CAT-10L`, `CAT-20L` (label ukuran + stok per outlet)

### 6) Dokumentasi (Frontend + Fitri)

- [x] Panduan uji manual Bahasa Indonesia: [SPRINT-5-MANUAL-UJI.md](../testing/SPRINT-5-MANUAL-UJI.md)
- [x] Indeks dokumentasi (`INDEX.md`, `INDEX.json`) disinkronkan Sprint 5

---

## Verifikasi Area Berubah

- `npm run lint --workspace=@barokah/api` ✅
- `npm run typecheck --workspace=@barokah/api` ✅
- `npm run test --workspace=@barokah/api` ✅ (26 tests, termasuk guard hold + grid)
- `npm run build --workspace=@barokah/api` ✅
- `npm run lint --workspace=@barokah/web` ✅
- `npm run typecheck --workspace=@barokah/web` ✅
- `npm run test --workspace=@barokah/web` ✅ (15/15 pass)
- `npm run build --workspace=@barokah/web` ✅
  - Catatan: warning deteksi plugin ESLint Next.js pada `next build` masih muncul (non-blocking).

---

## URL Uji Manual Web (dev)

| Layar | URL |
|-------|-----|
| Login | http://localhost:3001/login |
| Master Produk | http://localhost:3001/master/products |
| Kasir | http://localhost:3001/pos |

Skenario lengkap (Bahasa Indonesia): [SPRINT-5-MANUAL-UJI.md](../testing/SPRINT-5-MANUAL-UJI.md)

---

## Endpoint Uji Backend (manual / Postman)

Prefix global: `api/v1`. Auth: `POST /api/v1/auth/login` → Bearer token.

| Metode | Path | Tujuan uji |
|--------|------|------------|
| `GET` | `/api/v1/products` | Master list — induk `CAT-PARENT` + turunan terlihat |
| `GET` | `/api/v1/products/grid` | Grid kasir — **tanpa** `CAT-PARENT`, ada `CAT-5L` dst. |
| `POST` | `/api/v1/products` | Buat turunan varian (MANAGER/OWNER) |
| `POST` | `/api/v1/transactions/hold` | Hold dengan `productId` induk → `422 INVALID_INPUT` |
| `POST` | `/api/v1/transactions/checkout-split` | Checkout induk → `422 INVALID_INPUT` |

**Kredensial seed dev:** `kasir@barokah.local` / `Kasir123!` (shift harus dibuka untuk checkout).

**SKU seed varian:** `CAT-PARENT` (induk), `CAT-5L`, `CAT-10L`, `CAT-20L`.

---

## Catatan Risiko Tersisa

1. Migrasi `20260602000000_product_variants` wajib dijalankan di staging/prod (`prisma migrate deploy`) sebelum deploy API terbaru.
2. Warning plugin ESLint Next.js masih menjadi noise pada build output web (bukan backend).
3. Belum ada flow bundling (Sprint 6).
4. Belum mencakup multi satuan konversi stok lintas varian (sprint berikutnya).
5. Validasi belum mewajibkan parent `hasVariants: true` saat assign `parentProductId` (enhancement opsional).

---

## Next Action (post-close)

1. Pak Zaki: checklist uji manual web di [SPRINT-5-MANUAL-UJI.md](../testing/SPRINT-5-MANUAL-UJI.md).
2. Yoga/Fajar: `prisma migrate deploy` di staging/prod sebelum deploy API terbaru.
3. Hendra: kickoff Sprint 6 — bundling fixed berbasis varian stabil.
