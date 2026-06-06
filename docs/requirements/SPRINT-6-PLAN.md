> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Requirements | Audience: Pak Zaki, Budi, Hendra, Fajar, Arif, Fitri

# Sprint 6 Plan — Jalur Backend/Integrasi

> **Periode:** Sprint 6  
> **Tanggal plan:** 2 Juni 2026  
> **Owner eksekusi:** Fajar (Backend/API) + Arif (Integrasi)  
> **Status akhir:** **CLOSED** (final check 2 Juni 2026)  
> **Referensi:** [SPRINT-5-CLOSURE.md](../sprint/SPRINT-5-CLOSURE.md), [FEATURE-BACKLOG.md](./FEATURE-BACKLOG.md), [VISION-ZAKI-MATURED.md](./VISION-ZAKI-MATURED.md)

---

## Tujuan Sprint

1. Implement bundling dasar berbasis SKU varian jual.
2. Lanjutkan multi-satuan jual + konversi stok dasar backend.
3. Perkuat reliability sync/idempotensi minimal pada operasi transaksi kritikal.
4. Tambah cakupan test backend untuk area kritikal Sprint 6.

---

## Scope In-Sprint (Backend/Integrasi)

### 1) Bundling dasar

- Tambah model backend untuk rule bundle:
  - `product_bundles`
  - `product_bundle_items`
- Rule validasi:
  - produk induk varian (`hasVariants: true`) tidak bisa jadi header bundle
  - komponen bundle wajib SKU jual aktif
  - tidak boleh self-reference (produk bundle jadi komponen dirinya sendiri)
- Endpoint:
  - `GET /api/v1/products/bundles`
  - `POST /api/v1/products/bundles`

### 2) Multi-satuan jual + konversi

- Tambah model backend:
  - `product_unit_conversions`
- Rule validasi:
  - satuan jual alternatif tidak boleh sama dengan satuan dasar produk
  - faktor konversi wajib > 0
- Endpoint:
  - `GET /api/v1/products/unit-conversions`
  - `POST /api/v1/products/unit-conversions`
  - `POST /api/v1/products/unit-conversions/convert` (utility hitung qty base)

### 3) Reliability/idempotensi transaksi

- Tambah `clientRequestId` untuk `checkout-cash` dan `checkout-split`.
- Jika request id yang sama diterima ulang, backend mengembalikan transaksi existing (idempotent replay) alih-alih membuat transaksi ganda.
- Checkout split tetap pakai retry terbatas untuk konflik serializable (`P2034`).

### 4) Integrasi perilaku stok untuk bundle

- Saat SKU bundle dijual, pengurangan stok dilakukan pada komponen bundle (atomic dalam DB transaction).
- Pencatatan `stock_movements` mengikuti komponen yang benar-benar terpakai.

---

## Out of Scope Sprint 6 (tetap)

- Bundling fleksibel/terjadwal/BXGY.
- Promo engine lanjutan.
- Offline queue penuh lintas kanal.
- Perubahan scope produk (tetap retail omnichannel, tanpa F&B sesuai ADR-003).

---

## Exit Criteria Sprint 6

- Fitur backend bundling dasar dan multi-satuan konversi tersedia via endpoint.
- Validasi bisnis utama jalan dan ter-cover test kritikal.
- Reliability idempotensi minimal untuk checkout aktif.
- Verifikasi `@barokah/api`: lint, typecheck, test, build lulus.

---

## Checklist Final Sprint 6

- [x] Bundling SKU varian dasar selesai (model, validasi, endpoint).
- [x] Multi-satuan konversi selesai (model, validasi, endpoint convert).
- [x] Checkout cash/split mendukung idempotensi `clientRequestId`.
- [x] Pengurangan stok komponen bundle atomic pada checkout.
- [x] Verifikasi `@barokah/api` lint/typecheck/test/build lulus.
- [x] Verifikasi `@barokah/web` lint/typecheck/test/build lulus.
- [x] UAT final backend + frontend flow utama tercatat di `docs/testing/SPRINT-6-UAT-FINAL.md`.
- [x] Sprint closure final diupdate ke status `CLOSED` (`docs/sprint/SPRINT-6-CLOSURE.md`).

