> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Sprint | Audience: Pak Zaki, Hendra, Fajar, Dimas, Fitri

# Sprint 6 — Progress Report (Final)

> **Tanggal update:** 2 Juni 2026  
> **Orchestrator:** Budi Santoso (CEO)  
> **Jalur:** Backend + Frontend flow utama + UAT final

---

## Status Ringkas Backend

- **Progress backend Sprint 6:** **100%**
- **Status:** **CLOSED**
- **Scope tetap aman:** tidak ada perubahan scope produk (tetap retail omnichannel sesuai ADR-003).

---

## Deliverables Backend Sprint 6

### 1) Bundling dasar berbasis SKU varian jual

- Prisma schema + migrasi baru:
  - `product_bundles`
  - `product_bundle_items`
- API katalog:
  - `GET /api/v1/products/bundles`
  - `POST /api/v1/products/bundles`
- Validasi bisnis:
  - produk induk varian tidak bisa jadi header bundle
  - komponen bundle wajib SKU aktif
  - self-reference komponen ditolak

### 2) Multi-satuan jual + konversi stok dasar

- Prisma schema + migrasi baru:
  - `product_unit_conversions`
- API katalog:
  - `GET /api/v1/products/unit-conversions`
  - `POST /api/v1/products/unit-conversions`
  - `POST /api/v1/products/unit-conversions/convert`
- Validasi bisnis:
  - satuan jual alternatif harus berbeda dari satuan dasar produk
  - faktor konversi > 0

### 3) Reliability sync/idempotensi minimal transaksi kritikal

- `clientRequestId` ditambahkan pada:
  - `POST /api/v1/transactions/checkout-cash`
  - `POST /api/v1/transactions/checkout-split`
- Replay request dengan `clientRequestId` sama akan mengembalikan transaksi existing (idempotent replay).
- Checkout split tetap menggunakan retry policy serializable conflict (`P2034`).

---

## Endpoint/Flow Siap Uji Backend

1. `POST /api/v1/products/bundles` lalu `GET /api/v1/products/bundles`
2. `POST /api/v1/products/unit-conversions` lalu `GET /api/v1/products/unit-conversions`
3. `POST /api/v1/products/unit-conversions/convert` untuk simulasi qty base
4. `POST /api/v1/transactions/checkout-split` dengan `clientRequestId` yang sama (dua kali) untuk validasi idempotensi
5. Checkout SKU bundle untuk memastikan stok komponen berkurang atomik

Flow uji utama:
- Setup bundle untuk SKU varian jual.
- Checkout SKU bundle dan verifikasi `stock_movements` tercatat ke komponen bundle.
- Replay checkout dengan `clientRequestId` sama dan pastikan tidak membuat transaksi ganda.

---

## Hasil Verifikasi Backend

- `npm run lint --workspace=@barokah/api` ✅
- `npm run typecheck --workspace=@barokah/api` ✅
- `npm run test --workspace=@barokah/api` ✅
- `npm run build --workspace=@barokah/api` ✅
- `npm run lint --workspace=@barokah/web` ✅
- `npm run typecheck --workspace=@barokah/web` ✅
- `npm run test --workspace=@barokah/web` ✅
- `npm run build --workspace=@barokah/web` ✅

---

## UAT Final Sprint 6 (Backend + Frontend)

Referensi checklist detail: `docs/testing/SPRINT-6-UAT-FINAL.md`

- ✅ Bundling SKU varian: create/list bundle API teruji, checkout mengurangi stok komponen bundle, guard induk varian tetap aktif.
- ✅ Multi-satuan konversi: create/list/convert endpoint teruji, rule satuan dasar vs alternatif tervalidasi.
- ✅ Checkout cash/split idempotent: replay dengan `clientRequestId` mengembalikan transaksi existing, tidak membuat transaksi ganda.
- ✅ Hold/recall + flow kasir `/pos`: test web `src/app/pos/page.test.tsx` dan test API recall/hold lulus.

---

## Risiko Tersisa (Non-Blocking) + Mitigasi

- **Outlet-level bundle policy belum ada** (saat ini tenant-level).  
  Mitigasi: masukkan refinement story Sprint 7 untuk policy per outlet + migration guard.
- **E2E lintas layer belum lengkap** untuk jalur bundling + multi-satuan + idempotensi dalam satu skenario browser-to-API.  
  Mitigasi: tambah 1 paket E2E prioritas (playwright/supertest flow gabungan) di Sprint 7.
- **Offline queue lintas kanal penuh** belum masuk Sprint 6 (sesuai roadmap).  
  Mitigasi: tetap carry-over ke fase berikutnya, tidak menghambat acceptance Sprint 6.
