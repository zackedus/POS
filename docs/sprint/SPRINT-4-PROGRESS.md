> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Sprint | Audience: Pak Zaki, Hendra, Fajar, Dimas, Arif, Fitri

# Sprint 4 — Progress Report (Frontend + Backend)

> **Tanggal update:** 2 Juni 2026  
> **Orchestrator:** Budi Santoso (CEO)  
> **Referensi:** [SPRINT-4-PLAN.md](../requirements/SPRINT-4-PLAN.md), [SPRINT-3-CLOSURE.md](./SPRINT-3-CLOSURE.md)

---

## Status Ringkas Gabungan

- **Progress frontend Sprint 4:** **96%**
- **Progress backend Sprint 4:** **94%**
- **Progress gabungan Sprint 4 (weighted):** **95%**
- **Status umum:** **close-ready** (siap ditutup dengan carry-over non-blocking ke sprint berikutnya).
- **Scope tetap aman:** tidak ada perubahan scope retail/online/offline sesuai ADR-003.

---

## Bagian Frontend (Dimas)

### Implementasi Frontend Selesai

- [x] Split payment UI diperkuat untuk metode aktif saat ini (`CASH`, `TRANSFER`) dan indikator metode tambahan (`QRIS`, `E-Wallet`, `Kartu`).
- [x] Validasi nominal split diperketat:
  - nominal wajib integer >= 0
  - total split harus sama dengan total keranjang
  - tombol checkout split disabled jika input belum valid
- [x] UX error/retry/recovery operasional kasir:
  - fallback pesan jaringan saat koneksi gagal
  - tombol retry kontekstual untuk checkout tunai, hold, recall, dan split
  - pesan error split lebih operasional (stok berubah/validasi metode)

### Penambahan Test Frontend

- [x] `apps/web/src/app/pos/page.test.tsx`
  - jalur sukses split payment cash+transfer
  - edge-case mismatch nominal split
  - edge-case nominal desimal (blocked submit)
  - retry split setelah gagal
  - retry hold saat gangguan jaringan
  - jalur hold/recall sukses

### Hasil Verifikasi Frontend

- `npm run lint --workspace=@barokah/web` ✅
- `npm run typecheck --workspace=@barokah/web` ✅
- `npm run test --workspace=@barokah/web` ✅ (13/13 pass)
- `npm run build --workspace=@barokah/web` ✅
- Sinkronisasi kontrak respons split checkout frontend sudah mengikuti format backend `payments` (menghapus mismatch `cashAmount/transferAmount`).
- Catatan: warning plugin Next.js ESLint masih muncul saat build (non-blocking, dipindah sebagai carry-over Sprint 5).

---

## Bagian Backend (Fajar)

### Implementasi Backend Selesai

#### 1) Ekspansi Split Payment (API + Validasi + Error Mapping)

- [x] Kontrak DTO `checkout-split` diperluas untuk menerima metode:
  - `CASH`
  - `TRANSFER`
  - `QRIS`
  - `E_WALLET`
  - `CARD`
- [x] Validasi service diperkuat:
  - split wajib **2-3 payment lines**
  - metode wajib **unik** (tanpa duplikasi)
  - nominal tiap metode wajib positif
  - total nominal payment wajib sama dengan total transaksi
- [x] Error mapping untuk invalid split distandarkan ke:
  - `ErrorCodes.INVALID_INPUT` (422) untuk mix/nominal/rekonsiliasi tidak valid
- [x] Response split checkout dirapikan menjadi ringkasan payment per metode (`payments`) agar frontend/integrasi lebih mudah consume.

#### 2) Reliability Hold/Recall/Split (Concurrency + Intermittent Safety)

- [x] Guard race-condition recall ditambahkan:
  - jika hold sudah direcall di sesi lain (delete conflict), API mengembalikan `ErrorCodes.CONFLICT`
  - pesan diarahkan untuk reload daftar hold sebelum retry
- [x] Retry-safe behavior untuk transaksi split ditambahkan pada level service:
  - retry terbatas untuk konflik transaksi serializable (`P2034`) agar lebih tahan gangguan intermittent/concurrency spike
  - tetap fail-fast untuk error non-retryable

#### 3) Penambahan Test Backend Kritis

- [x] Test split payment baru:
  - sukses mix `QRIS + CARD`
  - reject metode unsupported
  - existing tests invalid total dan duplikasi metode tetap lulus
- [x] Test reliability baru:
  - recall conflict saat hold sudah direcall sesi lain
- [x] Test reliability retry serializable conflict (`P2034`) ditambahkan untuk memastikan retry policy berjalan.
- [x] Total suite API: **20/20 pass**

### Endpoint Backend Utama Siap Uji

1. `POST /api/v1/transactions/checkout-split`
   - support kombinasi `CASH/TRANSFER/QRIS/E_WALLET/CARD` (2-3 line, unik, total match)
2. `DELETE /api/v1/transactions/held/:id`
   - lebih aman terhadap recall concurrency (conflict-aware)
3. `GET /api/v1/transactions/held`
   - dipakai untuk reload state hold sebelum retry recall

### Hasil Verifikasi Backend

- `npm run lint --workspace=@barokah/api` ✅
- `npm run typecheck --workspace=@barokah/api` ✅
- `npm run test --workspace=@barokah/api` ✅ (20/20 pass)
- `npm run build --workspace=@barokah/api` ✅

---

## Risiko Tersisa (Gabungan)

1. Warning konfigurasi Next.js ESLint plugin saat build web belum ditutup.
2. E2E lintas service untuk jaringan intermittent (frontend retry + backend behavior) belum lengkap.
3. Mapping error provider payment gateway eksternal (timeout/issuer decline real gateway) belum aktif penuh.

---

## Next Action Gabungan

1. Tutup warning plugin Next.js ESLint agar exit criteria build frontend benar-benar bersih.
2. Tambah e2e lintas layer untuk retry jaringan/intermittent pada flow hold/recall/split.
3. Aktifkan dan uji error mapping gateway-level saat adaptor Midtrans QRIS/e-wallet/card diaktifkan penuh.

---

## Kesimpulan Sprint 4 Saat Ini

- **Backend:** siap uji untuk scope utama Sprint 4 (split expansion + reliability guard + test kritikal).
- **Frontend:** siap uji internal dengan hardening UX, retry UX, dan kontrak split checkout yang sudah sinkron ke backend.
- **Status gabungan Sprint 4:** **Close-ready**.
