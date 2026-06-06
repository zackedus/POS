> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Testing | Audience: Pak Zaki, Citra, Fajar, Dimas, Budi, Fitri

# Sprint 11 — Test Plan (Offline PWA Toko Fisik)

> **Tanggal:** 2 Juni 2026  
> **Status:** **EXECUTED** — UAT final PASS → [SPRINT-11-UAT-FINAL.md](./SPRINT-11-UAT-FINAL.md)  
> **Owner QA:** Citra Lestari (`@qa`)  
> **Jalur:** Parallel QA (AC frozen dari handoff Sprint 10 + ADR-003)  
> **Dev lane:** Dimas + Fajar — PWA shell, IndexedDB queue, reconnect sync, idempotensi `clientRequestId`

**Referensi:** [ADR-003](../decisions/ADR-003-SCOPE-RETAIL-ONLINE-OFFLINE.md), [SPRINT-10-CLOSURE.md](../sprint/SPRINT-10-CLOSURE.md), [ERROR-HANDLING-VALIDATION.md](../standards/ERROR-HANDLING-VALIDATION.md), visi Pak Zaki §8.2 & §10.5 (`.cursor/dokument rencana zaki.md`)

---

## Ringkasan

| Metrik | Nilai |
|--------|-------|
| **Total test case fungsional** | **38** |
| Breakdown — Antrean offline (OQ) | 10 |
| Breakdown — Sinkron ulang (OS) | 9 |
| Breakdown — Idempotensi (OI) | 7 |
| Breakdown — Banner UI (UB) | 8 |
| Breakdown — PWA shell (OP) | 4 |
| **Item UAT close (draft)** | **14** — lihat [§ UAT Checklist Draft](#uat-checklist-draft-sprint-11-close) |
| **Regresi wajib Sprint 10** | Void, struk, checkout idempoten (smoke) |

---

## Scope Uji

### Dalam scope Sprint 11 (P0)

1. **Service worker + PWA shell** — `/pos` dan `/login` dapat dibuka saat jaringan putus (cache shell).
2. **Antrean offline (IndexedDB)** — checkout tunai & split masuk antrean saat offline; status `pending` / `syncing` / `failed`.
3. **Sinkron ulang** — auto-sync saat event `online`; tombol manual **Sinkronkan Sekarang**; pesan hasil sync.
4. **Idempotensi** — `clientRequestId` sama tidak membuat transaksi ganda (client queue + API replay).
5. **Banner koneksi & antrean** — indikator offline, jumlah pending, CTA sync (selaras Maya / §10.5 visi Pak Zaki).

### Di luar scope (defer)

- Master data cache penuh offline (produk/harga/stok lokal) — spike berikutnya.
- Void/refund dari antrean offline.
- Hold bill offline.
- Printer thermal fisik / Bluetooth.
- Expo mobile SQLite.
- Penjualan online (Epic J) — jalur discovery terpisah.

---

## Prasyarat & Lingkungan

| Item | Nilai |
|------|-------|
| API | `http://localhost:3000/api/v1` |
| Web kasir | `http://localhost:3001/pos` |
| DB | PostgreSQL + `npm run db:seed` |
| Kredensial | `kasir@barokah.local` / `Kasir123!` |
| Shift | Buka shift aktif sebelum checkout |
| Browser | Chrome/Edge terbaru (PWA + IndexedDB) |
| DevTools | **Application → IndexedDB → `barokah-pos-offline`** |

**Simulasi offline:** DevTools → Network → **Offline**, atau matikan Wi‑Fi setelah shell ter-cache.

**File implementasi (acuan dev):**

| Area | Path |
|------|------|
| IndexedDB queue | `apps/web/src/lib/offline-queue.ts` |
| Sync worker logic | `apps/web/src/lib/offline-sync.ts` |
| Hook kasir | `apps/web/src/hooks/useOfflinePos.ts` |
| Banner UI | `apps/web/src/components/pos/OfflineBanner.tsx` |
| Service worker | `apps/web/public/sw.js` |
| Manifest PWA | `apps/web/public/manifest.webmanifest` |
| API idempoten | `apps/api/src/modules/transactions/transactions.service.ts` (`clientRequestId`) |

---

## Matriks Prioritas

| Prioritas | Arti | Gate |
|-----------|------|------|
| **P0** | Blocker sprint close / UAT | Harus PASS |
| **P1** | Penting, waiver butuh Budi + Pak Zaki | Target PASS |
| **P2** | Nice-to-have / edge jarang | Document only |

---

## Test Cases — Antrean Offline (SCR-OQ)

| ID | Prioritas | Judul | Langkah singkat | Hasil yang diharapkan |
|----|-----------|-------|-----------------|------------------------|
| SCR-OQ-01 | P0 | Checkout tunai saat offline masuk antrean | Offline → tambah produk → Bayar tunai | Transaksi tidak hilang; entri `checkout-cash` di IndexedDB status `pending`; UI konfirmasi lokal |
| SCR-OQ-02 | P0 | Checkout split saat offline masuk antrean | Offline → split cash+transfer valid | Entri `checkout-split` di IndexedDB; payload `payments[]` lengkap |
| SCR-OQ-03 | P0 | `clientRequestId` tersimpan di payload | Inspect entri antrean | Field `clientRequestId` non-kosong, konsisten dengan `id` entri |
| SCR-OQ-04 | P0 | Counter pending akurat | Enqueue 2 transaksi | `countPendingOfflineTransactions()` = 2; banner menampilkan angka sama |
| SCR-OQ-05 | P0 | Urutan FIFO antrean | Enqueue A lalu B (timestamp berbeda) | `listOfflineQueueEntries()` terurut `createdAt` asc |
| SCR-OQ-06 | P1 | Reload halaman tidak menghapus antrean | Enqueue → refresh `/pos` | Entri masih ada; pending count sama |
| SCR-OQ-07 | P1 | Status `syncing` saat upload | Trigger sync satu entri | Status sementara `syncing`, `attemptCount` naik |
| SCR-OQ-08 | P0 | Entri sukses dihapus dari antrean | Sync berhasil | Record hilang dari IndexedDB; pending count turun |
| SCR-OQ-09 | P0 | Entri gagal tetap `failed` | API return 422/500 atau network error | Status `failed`; `lastError` terisi; entri tidak dihapus |
| SCR-OQ-10 | P1 | IndexedDB tidak tersedia | Lingkungan tanpa IndexedDB (mock/test) | Pesan error jelas; tidak corrupt state aplikasi |

---

## Test Cases — Sinkron Ulang (SCR-OS)

| ID | Prioritas | Judul | Langkah singkat | Hasil yang diharapkan |
|----|-----------|-------|-----------------|------------------------|
| SCR-OS-01 | P0 | Auto-sync saat koneksi pulih | Enqueue offline → Online (event `online`) | `syncOfflineQueue()` terpanggil; transaksi muncul di server |
| SCR-OS-02 | P0 | Tombol **Sinkronkan Sekarang** | Online + pending > 0 → klik tombol | Semua entri pending diproses; loading state `Menyinkronkan…` |
| SCR-OS-03 | P0 | Sync ditolak saat masih offline | Offline + pending → panggil sync manual | Pesan: *"Masih offline — sinkronisasi ditunda…"*; tidak ada call API |
| SCR-OS-04 | P0 | Payload cash → API benar | Sync entri cash | `POST .../checkout-cash` body = items + `cashReceived` + `clientRequestId` |
| SCR-OS-05 | P0 | Payload split → API benar | Sync entri split | `POST .../checkout-split` dengan `payments` + `clientRequestId` |
| SCR-OS-06 | P0 | Pesan sukses penuh | 2 entri, keduanya sukses | `syncMessage`: *"N transaksi berhasil disinkronkan."* |
| SCR-OS-07 | P1 | Pesan parsial sukses/gagal | 2 entri: 1 sukses, 1 gagal (stok habis) | Pesan campuran: *"1 berhasil, 1 gagal — periksa antrean."* |
| SCR-OS-08 | P1 | Retry manual entri `failed` | Perbaiki kondisi → Sinkronkan lagi | Entri `failed` ikut diproses ulang (`listPendingOfflineTransactions` includes `failed`) |
| SCR-OS-09 | P2 | Banyak entri berurutan | 5+ entri pending | Semua ter-sync FIFO tanpa deadlock UI (`syncing` flag) |

---

## Test Cases — Idempotensi (SCR-OI)

| ID | Prioritas | Judul | Langkah singkat | Hasil yang diharapkan |
|----|-----------|-------|-----------------|------------------------|
| SCR-OI-01 | P0 | API replay `clientRequestId` tunai | POST checkout-cash 2× dengan `clientRequestId` sama | Response transaksi **existing**; DB tidak ada duplikat |
| SCR-OI-02 | P0 | API replay `clientRequestId` split | POST checkout-split 2× id sama | Sama seperti OI-01 untuk split |
| SCR-OI-03 | P0 | Sync offline → server idempoten | Enqueue dengan ID `X` → sync → trigger sync ulang entri yang sama (simulasi) | Hanya satu transaksi di `transactions` untuk outlet + `clientRequestId` |
| SCR-OI-04 | P0 | `clientRequestId` unik per entri antrean | Enqueue 3 checkout offline | 3 UUID/`offline-*` berbeda |
| SCR-OI-05 | P1 | Auto-sync ganda saat flapping network | Online/offline cepat 3× | Tidak ada transaksi ganda (regresi race) |
| SCR-OI-06 | P1 | Stok: replay tidak double-deduct | Replay idempoten setelah checkout sukses | `sku_stock` tidak berkurang dua kali |
| SCR-OI-07 | P2 | Tanpa `clientRequestId` (online langsung) | Checkout online normal tanpa field | Perilaku existing Sprint 6 tetap (bukan duplikasi wajib) |

---

## Test Cases — Banner UI (SCR-UB)

| ID | Prioritas | Judul | Langkah singkat | Hasil yang diharapkan |
|----|-----------|-------|-----------------|------------------------|
| SCR-UB-01 | P0 | Banner tampil saat offline | Network offline di `/pos` | `data-testid="offline-banner"` visible; headline *"Mode offline — transaksi disimpan lokal"* |
| SCR-UB-02 | P0 | Subcopy edukasi offline | Offline | Teks: checkout masuk IndexedDB, sync saat online |
| SCR-UB-03 | P0 | Banner pending saat online | Online + pending > 0 | Headline: *"N transaksi menunggu sinkronisasi"*; warna biru |
| SCR-UB-04 | P0 | Tombol sync hanya saat online + pending | Offline + pending | Tombol **tidak** tampil; online + pending → tombol tampil |
| SCR-UB-05 | P0 | Banner tersembunyi saat bersih | Online + pending = 0 + no syncMessage | Banner tidak render |
| SCR-UB-06 | P1 | Pesan sukses sync (hijau) | Sync semua sukses | Headline/message hijau; pending = 0 |
| SCR-UB-07 | P1 | Aksesibilitas `aria-live` | Perubahan pending/offline | Screen reader mengumumkan status (`role="status"`) |
| SCR-UB-08 | P2 | Banner tidak menutupi tombol bayar | Viewport tablet 768px | Layout kasir tetap usable (Maya UX spot-check) |

---

## Test Cases — PWA Shell (SCR-OP)

| ID | Prioritas | Judul | Langkah singkat | Hasil yang diharapkan |
|----|-----------|-------|-----------------|------------------------|
| SCR-OP-01 | P0 | Service worker terdaftar | Buka `/pos` → Application → SW | SW aktif; cache `barokah-pos-v1-shell` |
| SCR-OP-02 | P0 | Shell `/pos` dari cache saat offline | Kunjungi `/pos` online → offline → refresh | Halaman kasir tetap load (bukan browser error page) |
| SCR-OP-03 | P1 | Manifest PWA valid | Inspect `manifest.webmanifest` | `name`, `display`, icons terbaca |
| SCR-OP-04 | P1 | API tidak di-cache SW | Offline → request produk/shift | Tidak ada stale API response palsu dari SW (fetch API pass-through) |

---

## Regresi Wajib (smoke — tidak dihitung dalam 38)

| ID | Area | Cek singkat |
|----|------|-------------|
| REG-S11-01 | Void Sprint 10 | Void transaksi terakhir + approval manager |
| REG-S11-02 | Struk digital | `GET /transactions/:id/receipt` + `ReceiptPanel` |
| REG-S11-03 | Checkout online idempoten | Replay `clientRequestId` (Sprint 6/7) |
| REG-S11-04 | Split payment | Checkout split cash+transfer sukses |
| REG-S11-05 | Multi-outlet scope | Kasir hanya outlet assigned |

---

## Automated Tests (target dev — parallel)

| Suite | File disarankan | Cakupan minimal |
|-------|-----------------|-----------------|
| Unit queue | `apps/web/src/lib/offline-queue.test.ts` | enqueue, list, pending count, update, remove |
| Unit sync | `apps/web/src/lib/offline-sync.test.ts` | sync success/fail, idempotent replay mock |
| Component | `apps/web/src/components/pos/OfflineBanner.test.tsx` | SCR-UB-01…05 |
| Hook | `apps/web/src/hooks/useOfflinePos.test.ts` | online/offline events, auto-sync |
| Integration POS | `apps/web/src/app/pos/page.test.tsx` | offline checkout → queue → sync mock |
| API (existing) | `transactions.service.test.ts` | regresi SCR-OI-01, SCR-OI-02 |

**Gate merge:** P0 automated untuk OQ/OS/OI/UB minimal ter-cover sebelum UAT final.

---

## UAT Checklist Draft (Sprint 11 Close)

> Checklist untuk **Pak Zaki** — eksekusi manual di staging setelah tim QA + dev sign-off teknis.

### Prasyarat UAT

- [ ] Build staging ter-deploy (**Yoga**)
- [ ] Seed data outlet `MAIN` + produk aktif
- [ ] Akun kasir + shift terbuka
- [ ] PWA di-install atau dibuka di Chrome (tablet/PC kasir)

### Skenario bisnis (P0)

- [ ] **UAT-01** — Putus internet di tengah transaksi → checkout tunai tetap selesai (struk lokal / nomor sementara).
- [ ] **UAT-02** — Banner offline jelas; kasir paham transaksi "aman" di antrean.
- [ ] **UAT-03** — Setelah internet pulih, transaksi otomatis/sync manual masuk ke laporan harian.
- [ ] **UAT-04** — Dua transaksi offline berurutan → keduanya muncul di server tanpa duplikat.
- [ ] **UAT-05** — Split payment offline (cash + transfer) tersinkron dengan benar.
- [ ] **UAT-06** — Counter *"N transaksi menunggu sinkronisasi"* akurat sebelum dan sesudah sync.
- [ ] **UAT-07** — Tombol **Sinkronkan Sekarang** berfungsi saat auto-sync gagal.
- [ ] **UAT-08** — Transaksi gagal sync (mis. stok habis) tetap di antrean dengan pesan yang bisa ditindaklanjuti kasir.

### Idempotensi & data (P0)

- [ ] **UAT-09** — Sync ulang setelah refresh browser tidak menduplikasi penjualan.
- [ ] **UAT-10** — Stok produk sesuai (tidak double-deduct) setelah sync offline.

### UX & regresi (P1)

- [ ] **UAT-11** — Banner tidak mengganggu alur scan + bayar (Maya spot-check).
- [ ] **UAT-12** — Void & struk transaksi **online** (Sprint 10) tetap berfungsi.
- [ ] **UAT-13** — Login + buka shift saat koneksi lambat (degradasi graceful).
- [ ] **UAT-14** — Pesan error **Bahasa Indonesia** — tidak ada kode HTTP mentah di UI kasir.

### Sign-off

| Peran | Nama | Tanggal | Go / No-go |
|-------|------|---------|------------|
| QA | Citra | | |
| Frontend | Dimas | | |
| Backend | Fajar | | |
| CEO | Budi | | |
| Pemilik | Pak Zaki | | |

---

## Defect Severity (Sprint 11)

| Severity | Contoh | Block close? |
|----------|--------|--------------|
| P0 | Duplikat transaksi setelah sync; data antrean hilang; checkout offline tidak jalan | Ya |
| P1 | Banner salah hitung; pesan sync membingungkan; retry gagal tanpa alasan | Waiver CEO |
| P2 | Warna banner; copy minor | Tidak |

---

## Handoff Log

| Field | Isi |
|-------|-----|
| **From** | Citra · QA Engineer |
| **To** | Dimas · Senior Frontend, Fajar · Senior Developer |
| **Task** | Test plan Sprint 11 offline PWA |
| **Deliverable** | `docs/testing/SPRINT-11-TEST-PLAN.md` (38 TC + 14 UAT draft) |
| **Blocked by** | — (draft parallel OK) |
| **Parallel OK?** | Ya — eksekusi UAT tunggu staging + integrasi `/pos` + banner |
| **Next action** | Implement automated SCR-OQ/OS/OI/UB; notify Citra saat build staging ready |

---

## Changelog Dokumen

| Tanggal | Versi | Perubahan |
|---------|-------|-----------|
| 2026-06-02 | 1.0 | Draft awal — 38 test case + UAT checklist 14 item |
