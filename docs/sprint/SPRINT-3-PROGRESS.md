# Sprint 3 — Progress Report (Transaksi Inti POS + QA Frontend + Audit Trail)

> **Tanggal:** 2 Juni 2026  
> **Orchestrator:** Budi Santoso (CEO)  
> **Referensi:** [SPRINT-2-CLOSURE.md](./SPRINT-2-CLOSURE.md)

---

## Status Ringkas

- **Progress Sprint 3 saat ini:** **100% (close-ready)**
- **Scope yang sudah dieksekusi:**
  - MVP transaksi inti POS web: keranjang + checkout cash (end-to-end API + UI)
  - Pencarian/filter cepat produk kasir + hold/recall transaksi pada `/pos`
  - Automated test frontend untuk jalur sukses utama + state kritikal
  - Audit trail aksi force-close shift
  - Re-check stok lebih dini saat recall hold + split payment hardening (validasi mix + UX retry)

---

## Implementasi Selesai di Iterasi Ini

### 0) Iterasi Lanjutan Sprint 3 (Hold/Recall Hardening + Split Payment Dasar)

- [x] **Hold/recall hardening (backend)**
  - recall hold (`DELETE /api/v1/transactions/held/:id`) sekarang melakukan re-check stok sebelum hold dipindahkan ke keranjang
  - konflik stok dideteksi lebih awal dan dikembalikan sebagai `INSUFFICIENT_STOCK` dengan pesan yang lebih jelas
- [x] **UX pesan `/pos` lebih jelas (frontend)**
  - pesan sukses hold/recall diperjelas agar kasir tahu next step
  - pesan gagal recall diarahkan untuk cek stok terbaru
- [x] **Split payment dasar (backend + UI sederhana)**
  - endpoint baru `POST /api/v1/transactions/checkout-split`
  - support pembayaran gabungan **CASH + TRANSFER**
  - validasi:
    - metode harus memuat CASH dan TRANSFER
    - total nominal payment harus sama dengan total transaksi
  - UI `/pos` menambahkan panel **Split Payment (Cash + Transfer)**:
    - input nominal cash
    - input nominal transfer
    - input referensi transfer opsional
    - aksi `Checkout Split`
- [x] **Penambahan test jalur baru**
  - backend: `apps/api/src/modules/transactions/transactions.service.test.ts`
    - recall konflik stok terdeteksi dini
    - split payment gagal saat total payment tidak match
  - frontend: `apps/web/src/app/pos/page.test.tsx`
    - jalur sukses checkout split payment cash+transfer

### 0.1) Iterasi Hardening Sprint 3 (2 Juni 2026, sore)

- [x] **Split payment edge-case hardening (backend)**
  - validasi `checkout-split` sekarang mewajibkan **tepat 2 payment line**
  - kombinasi metode wajib unik: **CASH + TRANSFER** (tanpa duplikasi)
  - invalid mix/duplikasi langsung ditolak dengan `INVALID_INPUT` sebelum transaksi DB berjalan
- [x] **Coverage tambahan hold/recall + split invalid mix (backend test)**
  - tambah test reject split dengan metode duplikat (invalid mix)
  - tambah test hold expired: hold dihapus saat recall dan error validasi dikembalikan
- [x] **UX kasir `/pos` hardening operasional (frontend)**
  - normalisasi input nominal split (angka bulat, no desimal, no negatif)
  - helper hint validasi nominal diperjelas untuk kondisi input tidak valid
  - feedback error split kini lebih kontekstual (stok berubah / shift belum buka / invalid input)
  - tambah aksi retry cepat: **"Coba Lagi Split Terakhir"** setelah split gagal
- [x] **Coverage tambahan frontend split retry**
  - test baru memverifikasi alur gagal split lalu retry sukses tanpa input ulang manual

### 1) Transaksi Inti POS (Keranjang + Checkout Cash)

- [x] Backend endpoint baru: `POST /api/v1/transactions/checkout-cash`
- [x] Validasi backend:
  - Shift kasir harus aktif (`SHIFT_NOT_OPEN`)
  - Produk harus aktif dan berada di tenant yang benar
  - Cek stok tersedia (`INSUFFICIENT_STOCK`)
  - Nominal tunai tidak boleh kurang dari total transaksi
- [x] Persist transaksi nyata:
  - Simpan `transactions`, `transaction_items`, `payments`
  - Kurangi `inventory_items`
  - Tulis `stock_movements` tipe `SALE`
- [x] Frontend `/pos`:
  - Muat katalog dari endpoint `products/grid`
  - Tambah/kurangi/hapus item di keranjang
  - Input tunai diterima
  - Checkout cash + tampil struk ringkas (receipt + kembalian)

### 2) Automated Test Frontend (State Kritikal Sprint 2)

- [x] Test halaman `master/categories`:
  - state loading
  - state error
- [x] Test halaman `shift/open`:
  - skenario konflik `SHIFT_ALREADY_OPEN`
  - tampil panel force-close
- [x] Test halaman `master/products`:
  - state error saat request produk gagal

### 4) Kasir `/pos`: Pencarian Cepat + Hold/Recall Transaksi

- [x] UI pencarian produk berbasis keyword (nama/SKU) di halaman `/pos`
- [x] Optimasi alur kasir:
  - produk terfilter real-time agar kasir cepat temukan item
  - fallback teks saat produk tidak ditemukan
- [x] Hold transaksi:
  - endpoint baru `POST /api/v1/transactions/hold`
  - menyimpan item keranjang aktif sebagai `held_transactions`
- [x] Recall transaksi:
  - endpoint baru `GET /api/v1/transactions/held` (list hold aktif)
  - endpoint baru `DELETE /api/v1/transactions/held/:id` (recall + hapus hold)
  - UI panel **Daftar Hold** di sisi kanan `/pos` untuk recall cepat kasir

### 5) Automated Test Frontend (Success Path Utama)

- [x] `apps/web/src/app/pos/page.test.tsx`
  - pencarian produk berhasil memfilter hasil
  - alur hold lalu recall kembali ke keranjang
- [x] `apps/web/src/app/shift/open/page.test.tsx`
  - skenario sukses buka shift (`Buka shift` → panel sukses tampil)
- [x] `apps/web/src/app/master/categories/page.test.tsx`
  - skenario sukses tambah kategori
- [x] `apps/web/src/app/master/products/page.test.tsx`
  - skenario sukses load dan render produk

### 3) Audit Trail Force-Close Shift

- [x] Service `forceCloseShift` sekarang menulis `audit_logs`:
  - `action: SHIFT_FORCE_CLOSE`
  - metadata actor/outlet/cashier/reason/timestamp
- [x] Unit test shift diperbarui untuk memverifikasi audit log tercatat

---

## Cara Uji (Fokus Area yang Diubah)

```powershell
cd "g:\baru 2026\juni\pos"
npm run test --workspace=@barokah/web
npm run lint --workspace=@barokah/web
npm run typecheck --workspace=@barokah/web
npm run build --workspace=@barokah/web
npm run lint --workspace=@barokah/api
npm run typecheck --workspace=@barokah/api
npm run build --workspace=@barokah/api
```

> Catatan update 2 Juni 2026 (lanjutan): blocker baseline route collection web **sudah resolved**. `npm run build --workspace=@barokah/web` lulus pada build normal dan clean build (`apps/web/.next` dihapus lalu build ulang).

## Flow Uji Manual MVP POS Web

1. Login sebagai kasir.
2. Buka shift di `/shift/open`.
3. Masuk `/pos`, klik beberapa produk agar masuk keranjang.
4. Gunakan input **Cari produk (nama/SKU)** untuk validasi filter cepat.
5. Klik **Hold Transaksi**, pastikan item berpindah dari keranjang ke panel **Daftar Hold**.
6. Klik **Recall** pada hold yang baru dibuat, pastikan item kembali ke keranjang.
7. Input nominal tunai diterima.
8. Klik **Checkout Tunai**.
9. Verifikasi:
   - transaksi sukses + receipt muncul
   - stok produk berkurang
   - `stock_movements` tercatat
10. Uji hardening recall stok:
   - simpan transaksi dengan **Hold Transaksi**
   - ubah stok produk yang sama hingga kurang dari quantity hold (via DB/adjustment)
   - klik **Recall** pada hold tadi
   - verifikasi muncul error konflik stok lebih awal (sebelum checkout)
11. Uji split payment dasar:
   - isi keranjang produk
   - isi panel **Split Payment (Cash + Transfer)**:
     - Nominal Cash
     - Nominal Transfer
     - (opsional) referensi transfer
   - pastikan jumlah cash + transfer = total keranjang
   - klik **Checkout Split**
   - verifikasi transaksi sukses dan stok berkurang

---

## Blocker / Risiko Saat Ini

1. Split payment sengaja dibatasi ke CASH+TRANSFER sesuai scope Sprint 3; perlu ekspansi metode di sprint berikutnya.
2. Coverage hold/recall untuk concurrency lintas kasir/outlet dan gangguan jaringan intermittent belum penuh (residual risk non-blocking).
3. Warning plugin ESLint Next.js masih muncul saat `build` web; lint tetap lulus, namun perlu perapian konfigurasi agar output build bersih.

---

## Next Actions (3)

1. Rapikan konfigurasi ESLint Next.js plugin di workspace web sampai warning `build` hilang.
2. Lanjutkan split payment fase berikutnya: tambah metode QRIS/e-wallet/card + contract error map per metode.
3. Tambah test e2e skenario hold/recall & split saat stok berubah + simulasi retry network intermittent.

## Catatan Run Terbaru (2 Juni 2026, 15:20 WIB)

- Incident `EADDRINUSE:3000` ditangani via `npm run dev:api:clean` (safe script kill proses konflik lalu start ulang API di `API_PORT=3000`).
- API tervalidasi sehat di `http://[::1]:3000/api/v1/health` (`success=true`, status `ok`) dan login sukses di `POST /api/v1/auth/login` memakai akun seed `owner@barokah.local`.
- Hardening Sprint 3 lanjutan selesai di web `/pos`:
  - helper hint split payment untuk mismatch nominal / nominal kosong
  - tombol `Checkout Split` sekarang ter-guard (disable) sampai nominal valid
  - test frontend baru untuk mismatch guard ditambahkan di `apps/web/src/app/pos/page.test.tsx`
- Verifikasi test terbaru: `npm run test --workspace=@barokah/web -- src/app/pos/page.test.tsx` **PASS (3/3)**.

## Catatan Run Terbaru (2 Juni 2026, 15:35 WIB)

- Hardening backend selesai:
  - validasi split payment tepat 2 line + unique method CASH/TRANSFER di `transactions.service.ts`
  - coverage tambahan di `transactions.service.test.ts` untuk invalid mix + expired hold recall
- Hardening frontend `/pos` selesai:
  - normalisasi nominal split + hint validasi input
  - feedback error split lebih operasional
  - tombol retry `Coba Lagi Split Terakhir` setelah split gagal
  - test retry ditambahkan di `apps/web/src/app/pos/page.test.tsx`
- Hasil verifikasi area berubah:
  - `npm run test --workspace=@barokah/api` ✅
  - `npm run test --workspace=@barokah/web -- src/app/pos/page.test.tsx` ✅ (4/4)
  - `npm run lint --workspace=@barokah/api` ✅
  - `npm run typecheck --workspace=@barokah/api` ✅
  - `npm run build --workspace=@barokah/api` ✅
  - `npm run lint --workspace=@barokah/web` ✅
  - `npm run typecheck --workspace=@barokah/web` ✅
  - `npm run build --workspace=@barokah/web` ✅ (warning Next.js ESLint plugin masih muncul, non-blocking)

## Catatan Verifikasi Final Penutupan (2 Juni 2026, 15:50 WIB)

- Re-run full gate area utama Sprint 3 selesai dengan hasil **lulus**:
  - `npm run lint --workspace=@barokah/api` ✅
  - `npm run typecheck --workspace=@barokah/api` ✅
  - `npm run test --workspace=@barokah/api` ✅ (16/16)
  - `npm run build --workspace=@barokah/api` ✅
  - `npm run lint --workspace=@barokah/web` ✅
  - `npm run typecheck --workspace=@barokah/web` ✅
  - `npm run test --workspace=@barokah/web` ✅ (11/11)
  - `npm run build --workspace=@barokah/web` ✅ (warning plugin Next.js ESLint tetap non-blocking)
- Tidak ada blocker P0 baru yang muncul dari rerun verifikasi.
