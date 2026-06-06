> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Testing | Audience: Pak Zaki, Fajar, Dimas, Fitri

# Sprint 6 — UAT Final Checklist

> **Tanggal:** 2 Juni 2026  
> **Status:** CLOSED-CANDIDATE tervalidasi (tanpa blocker)  
> **Owner uji:** Fajar (Backend/API), Dimas (Frontend), Budi (Orchestrator)

---

## Scope UAT Final

1. Bundling SKU varian.
2. Multi-satuan konversi.
3. Checkout cash/split idempotent.
4. Hold/recall + flow kasir `/pos`.

---

## Hasil Eksekusi Ringkas

| Area | Hasil | Bukti utama |
|---|---|---|
| Bundling SKU varian | ✅ PASS | Test API: guard header varian + potong stok komponen bundle |
| Multi-satuan konversi | ✅ PASS | Test API: validasi satuan dasar/alternatif + endpoint convert |
| Checkout cash/split idempotent | ✅ PASS | Test API: replay `clientRequestId` return transaksi existing |
| Hold/recall + flow kasir `/pos` | ✅ PASS | Test API hold/recall lulus + test web `/pos` lulus |

---

## Bukti Verifikasi Teknis (Re-run)

### API (`@barokah/api`)

- `npm run lint --workspace=@barokah/api` ✅
- `npm run typecheck --workspace=@barokah/api` ✅
- `npm run test --workspace=@barokah/api` ✅ (30/30 pass)
- `npm run build --workspace=@barokah/api` ✅

### Web (`@barokah/web`)

- `npm run lint --workspace=@barokah/web` ✅
- `npm run typecheck --workspace=@barokah/web` ✅
- `npm run test --workspace=@barokah/web` ✅ (18/18 pass)
- `npm run build --workspace=@barokah/web` ✅

---

## Checklist UAT Final (Pak Zaki)

- [x] Bundling SKU varian bisa dibuat dan dibaca ulang.
- [x] Checkout SKU bundle memotong stok komponen secara atomic.
- [x] Multi-satuan conversion create/list/convert tervalidasi.
- [x] Replay checkout dengan `clientRequestId` tidak membuat transaksi ganda.
- [x] Flow hold/recall tetap aman pada konflik/expired hold.
- [x] Halaman kasir `/pos` lolos test utama tanpa regresi.

---

## Yang Bisa Langsung Dites

1. **API bundling**
   - `POST /api/v1/products/bundles`
   - `GET /api/v1/products/bundles`
2. **API multi-satuan**
   - `POST /api/v1/products/unit-conversions`
   - `GET /api/v1/products/unit-conversions`
   - `POST /api/v1/products/unit-conversions/convert`
3. **API checkout idempotent**
   - `POST /api/v1/transactions/checkout-cash`
   - `POST /api/v1/transactions/checkout-split` (ulang `clientRequestId` sama)
4. **Flow kasir web**
   - Login: `/login`
   - Kasir: `/pos`
   - Shift open: `/shift/open`

---

## Isu Tersisa (Non-Blocking) + Mitigasi

| Isu | Klasifikasi | Mitigasi Eksekusi |
|---|---|---|
| Bundle policy masih tenant-level | Non-blocking | Tambah user story Sprint 7 untuk outlet-level rule + migration guard |
| E2E lintas web-api belum full chain | Non-blocking | Tambah 1 suite E2E prioritas untuk flow bundling-konversi-checkout |
| Offline queue lintas kanal belum Sprint 6 | Non-blocking (roadmap) | Lanjutkan sesuai fase berikutnya, tidak menghambat close Sprint 6 |
