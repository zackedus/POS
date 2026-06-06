> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Testing | Audience: Pak Zaki, Citra, Fajar, Yoga, Dimas, Budi, Fitri

# Sprint 12 — Test Plan (BullMQ · Konflik UI · Hold Offline · Product Cache)

> **Tanggal:** 2 Juni 2026  
> **Status:** **CLOSED** — UAT final PASS → [SPRINT-12-UAT-FINAL.md](./SPRINT-12-UAT-FINAL.md)  
> **Owner QA:** Citra Lestari (`@qa`)  
> **Jalur:** Parallel QA setelah AC frozen dari handoff [SPRINT-11-CLOSURE.md](../sprint/SPRINT-11-CLOSURE.md)  
> **Dev lane:** **Fajar + Yoga** (BullMQ) · **Dimas + Bima** (konflik UI, hold offline, product cache)

**Referensi:** [SPRINT-11-CLOSURE.md](../sprint/SPRINT-11-CLOSURE.md), [OFFLINE-SYNC.md](../algorithm/OFFLINE-SYNC.md), [SYNC.md](../api/SYNC.md), [SPRINT-11-TEST-PLAN.md](./SPRINT-11-TEST-PLAN.md), [ERROR-HANDLING-VALIDATION.md](../standards/ERROR-HANDLING-VALIDATION.md), visi Pak Zaki §8.2 & §10.5

---

## Ringkasan

| Metrik | Nilai |
|--------|-------|
| **Total test case fungsional** | **46** |
| Breakdown — BullMQ worker (SCR-BQ) | 12 |
| Breakdown — Konflik UI (SCR-CF) | 12 |
| Breakdown — Hold offline (SCR-HO) | 10 |
| Breakdown — Product cache (SCR-PC) | 12 |
| **Item UAT close (draft)** | **12** — lihat [§ UAT Checklist Draft](#uat-checklist-draft-sprint-12-close) |
| **Regresi wajib Sprint 11** | Antrean offline, idempotensi, PWA shell, void/struk (smoke) |

---

## Scope Uji

### Dalam scope Sprint 12 (P0)

1. **BullMQ worker** — Ganti in-process stub `SyncQueueProcessor`; job Redis + retry/backoff; `GET /sync/status` menampilkan `processor: bullmq`.
2. **UI resolve konflik** — Konsumsi `GET /sync/conflicts`; banner/modal kasir; aksi manual per [OFFLINE-SYNC.md](../algorithm/OFFLINE-SYNC.md).
3. **Hold bill offline (spike)** — Hold/recall masuk antrean IndexedDB; sync ke `POST /transactions/hold` saat online; konflik server-wins.
4. **Master data cache produk (MVP)** — Snapshot katalog di IndexedDB; grid kasir usable offline; `SYNC_MASTER_STALE` saat harga versi lama.

### Di luar scope (defer)

- Void/refund dari antrean offline.
- Sync stok antar outlet / marketplace.
- Expo mobile SQLite offline.
- Epic J — online storefront (discovery only).
- Printer thermal fisik.

---

## Prasyarat & Lingkungan

| Item | Nilai |
|------|-------|
| API | `http://localhost:3000/api/v1` |
| Web kasir | `http://localhost:3001/pos` |
| Redis | `redis://localhost:6379` (wajib untuk SCR-BQ) |
| DB | PostgreSQL + `npm run db:seed` |
| Kredensial | `kasir@barokah.local` / `Kasir123!` |
| Manager (eskalasi konflik) | `manager@barokah.local` / `Manager123!` |
| Shift | Buka shift aktif sebelum checkout/hold |
| Browser | Chrome/Edge terbaru |
| DevTools | IndexedDB: `barokah-pos-offline`, `barokah-pos-catalog` (target) |

**Simulasi offline:** DevTools → Network → **Offline**.

**File implementasi (acuan dev — target Sprint 12):**

| Area | Path (target / existing) |
|------|--------------------------|
| Sync processor stub | `apps/api/src/modules/sync/sync-queue.processor.ts` |
| BullMQ worker | `apps/api/src/modules/sync/sync-queue.worker.ts` (target) |
| Sync service | `apps/api/src/modules/sync/sync.service.ts` |
| Konflik API | `GET /api/v1/sync/conflicts` |
| Banner offline | `apps/web/src/components/pos/OfflineBanner.tsx` |
| Konflik UI | `apps/web/src/components/pos/SyncConflictBanner.tsx`, `SyncConflictModal.tsx` (target) |
| Hold offline queue | `apps/web/src/lib/offline-hold.ts` (target) |
| Product cache | `apps/web/src/lib/product-cache.ts` (target) |
| Catalog snapshot API | `GET /api/v1/catalog/snapshot` (target) |
| Kebijakan konflik | `docs/algorithm/OFFLINE-SYNC.md` |

---

## Matriks Prioritas

| Prioritas | Arti | Gate |
|-----------|------|------|
| **P0** | Blocker sprint close / UAT | Harus PASS |
| **P1** | Penting, waiver butuh Budi + Pak Zaki | Target PASS |
| **P2** | Edge jarang / observability | Document only |

---

## Test Cases — BullMQ Worker (SCR-BQ)

| ID | Prioritas | Judul | Langkah singkat | Hasil yang diharapkan |
|----|-----------|-------|-----------------|------------------------|
| SCR-BQ-01 | P0 | Job ter-enqueue setelah `POST /sync/queue` | Enqueue 1 entri checkout | Entri `PENDING` di DB; job ada di Redis queue `sync-replay` |
| SCR-BQ-02 | P0 | Worker memproses FIFO per outlet | Enqueue A lalu B | A diproses sebelum B; status `PROCESSING` → `APPLIED` |
| SCR-BQ-03 | P0 | Response `processor` = `bullmq` | `GET /sync/status` setelah deploy worker | Field `processor` bukan `in-process-stub` |
| SCR-BQ-04 | P0 | Replay checkout sukses via worker | Stok cukup, job selesai | `transactionId` terisi; status `APPLIED` |
| SCR-BQ-05 | P0 | Konflik stok → `CONFLICT` di worker | Replay saat stok habis | `conflictCode`: `INSUFFICIENT_STOCK`; tidak retry tanpa batas |
| SCR-BQ-06 | P0 | Retry transient error (5xx) | Simulasi DB timeout 1× lalu sukses | Backoff exponential; max 5 attempts; akhirnya `APPLIED` atau `FAILED` |
| SCR-BQ-07 | P0 | Max attempts → `FAILED` | Error permanen 5× | Status `FAILED`; `conflictMessage` terisi; tidak infinite loop |
| SCR-BQ-08 | P0 | Idempotensi `clientRequestId` via worker | Enqueue + replay job duplikat | Satu transaksi di DB; `idempotentReplay: true` pada response |
| SCR-BQ-09 | P1 | Tidak double-process job paralel | 2 worker instance, 1 entri | Hanya satu `APPLIED`; locking Redis/BullMQ |
| SCR-BQ-10 | P1 | Redis down — enqueue aman | Matikan Redis → POST queue | Entri tersimpan `PENDING`; pesan jelas; tidak corrupt data |
| SCR-BQ-11 | P1 | Stalled job recovery | Simulasi worker crash mid-job | Job kembali `active`/`waiting` per BullMQ stalled policy |
| SCR-BQ-12 | P2 | Metrik queue (ops) | Dashboard/CLI Yoga | Depth queue, failed count, latency terlihat |

---

## Test Cases — Konflik UI (SCR-CF)

| ID | Prioritas | Judul | Langkah singkat | Hasil yang diharapkan |
|----|-----------|-------|-----------------|------------------------|
| SCR-CF-01 | P0 | Banner konflik saat `conflictTotal > 0` | Buat 1 entri `CONFLICT` di server | `data-testid="sync-conflict-banner"` visible; headline Bahasa Indonesia |
| SCR-CF-02 | P0 | Fetch `GET /sync/conflicts` | Buka `/pos` online + konflik ada | Daftar konflik ter-load; scoped outlet kasir |
| SCR-CF-03 | P0 | Detail konflik `INSUFFICIENT_STOCK` | Klik item konflik | Modal: SKU, qty diminta vs tersedia; tanpa kode HTTP mentah |
| SCR-CF-04 | P0 | Aksi **Batalkan** (`CANCEL`) | Pilih batalkan pada konflik | Entri ditandai resolved; hilang dari banner; tidak retry otomatis |
| SCR-CF-05 | P0 | Aksi **Coba lagi** (`RETRY`) | Perbaiki stok → retry | Replay job; sukses → banner konflik hilang |
| SCR-CF-06 | P1 | Aksi **Sesuaikan qty** (`ADJUST_QTY`) | Kurangi qty di modal → retry | Payload baru; sync sukses atau konflik baru dengan pesan jelas |
| SCR-CF-07 | P1 | Eskalasi manager (`ESCALATE_MANAGER`) | Kasir eskalasi | Audit `resolvedByUserId`; manager dapat lihat di dashboard (jika scope sprint) |
| SCR-CF-08 | P0 | Konflik + banner offline tidak bentrok | Offline + pending + konflik server | Dua indikator terbaca; layout tidak menutupi tombol bayar |
| SCR-CF-09 | P1 | `SYNC_MASTER_STALE` di UI | Checkout dengan `priceSnapshotVersion` lama | Modal minta refresh katalog; CTA **Muat ulang katalog** |
| SCR-CF-10 | P1 | Banyak konflik (limit) | 3+ konflik | List + "lihat semua" atau scroll; max sesuai query `limit` |
| SCR-CF-11 | P1 | `aria-live` pengumuman konflik | Konflik baru muncul | Screen reader mengumumkan jumlah konflik |
| SCR-CF-12 | P2 | Konflik hilang setelah resolve semua | Resolve semua | Banner konflik hidden; `conflictTotal` = 0 di status API |

---

## Test Cases — Hold Offline (SCR-HO)

| ID | Prioritas | Judul | Langkah singkat | Hasil yang diharapkan |
|----|-----------|-------|-----------------|------------------------|
| SCR-HO-01 | P0 | Hold saat offline masuk antrean | Offline → isi keranjang → Hold Transaksi | Entri `hold-create` di IndexedDB; label + items tersimpan |
| SCR-HO-02 | P0 | UI konfirmasi hold lokal | Setelah hold offline | Pesan sukses Bahasa Indonesia; keranjang bisa dikosongkan |
| SCR-HO-03 | P0 | Daftar hold lokal saat offline | Buka panel hold | Hold lokal muncul bersama hold server (jika pernah sync) |
| SCR-HO-04 | P0 | Sync hold saat online | Hold offline → online → sync | `POST /transactions/hold` sukses; entri antrean dihapus |
| SCR-HO-05 | P0 | Recall hold lokal offline | Recall entri belum sync | Item kembali ke keranjang dari payload lokal |
| SCR-HO-06 | P1 | Konflik recall — hold sudah diambil sesi lain | Hold A sync; kasir B recall A | `CONFLICT` / pesan server-wins; entry `failed` + opsi buang lokal |
| SCR-HO-07 | P1 | Urutan FIFO: hold sebelum checkout | Hold lalu checkout di antrean | Hold ter-sync sebelum checkout (sequence) |
| SCR-HO-08 | P1 | Hold gagal sync — tetap di antrean | API 422 shift tutup | Status `failed`; `lastError` Bahasa Indonesia |
| SCR-HO-09 | P1 | Reload halaman — hold lokal persist | Hold → refresh `/pos` | Entri hold masih di IndexedDB |
| SCR-HO-10 | P2 | Hold kosong ditolak | Hold tanpa item | Validasi client; tidak enqueue |

---

## Test Cases — Product Cache (SCR-PC)

| ID | Prioritas | Judul | Langkah singkat | Hasil yang diharapkan |
|----|-----------|-------|-----------------|------------------------|
| SCR-PC-01 | P0 | Snapshot katalog saat online | Login + buka `/pos` online | `GET /catalog/snapshot` (atau setara) terpanggil; data di IndexedDB |
| SCR-PC-02 | P0 | `catalogVersion` tersimpan di meta | Inspect IndexedDB meta | Field version non-null; naik setelah pull ulang |
| SCR-PC-03 | P0 | Grid produk load offline | Online load → offline → refresh grid | Produk tampil dari cache; tidak blank error page |
| SCR-PC-04 | P0 | Pencarian produk offline | Offline → ketik "semen" | Filter dari cache lokal; hasil relevan |
| SCR-PC-05 | P0 | Checkout offline bawa `priceSnapshotVersion` | Checkout dari harga cache | Payload sync menyertakan version |
| SCR-PC-06 | P0 | Harga stale → `SYNC_MASTER_STALE` | Naikkan harga di server → sync checkout lama | Status `CONFLICT`; UI arahkan refresh (link SCR-CF-09) |
| SCR-PC-07 | P1 | Pull ulang katalog saat online | Klik refresh / auto on `online` | Cache replace; `catalogVersion` update |
| SCR-PC-08 | P1 | Scope outlet — cache terpisah | Ganti outlet (jika multi) | Cache key scoped `outletId`; tidak bocor produk outlet lain |
| SCR-PC-09 | P1 | Tidak storm API saat offline | Offline 5 menit | Zero request produk ke API (kecuali health ping opsional) |
| SCR-PC-10 | P1 | Stok tampilan cache = indikatif | Offline tampilkan stok | Label disclaimer "stok estimasi"; server wins saat sync |
| SCR-PC-11 | P1 | Produk non-aktif tidak di cache | Deactivate produk → pull | SKU tidak muncul di grid offline setelah refresh |
| SCR-PC-12 | P2 | Ukuran cache wajar | 500+ SKU seed | Enqueue/read < 2s di tablet spec dev |

---

## Regresi Wajib Sprint 11 (smoke — tidak dihitung dalam 46)

| ID | Area | Cek singkat |
|----|------|-------------|
| REG-S12-01 | Antrean checkout offline | SCR-OQ-01, SCR-OS-01 (Sprint 11) |
| REG-S12-02 | Idempotensi `clientRequestId` | SCR-OI-01, SCR-OI-03 |
| REG-S12-03 | Banner offline pending | SCR-UB-01…04 |
| REG-S12-04 | PWA shell offline | SCR-OP-02 |
| REG-S12-05 | Void & struk online | Sprint 10 smoke |
| REG-S12-06 | Hold/recall **online** | Sprint 4 happy path tetap PASS |

---

## Automated Tests (target dev — parallel)

| Suite | File disarankan | Cakupan minimal |
|-------|-----------------|-----------------|
| BullMQ worker | `apps/api/src/modules/sync/sync-queue.worker.test.ts` | SCR-BQ-01…08 |
| Sync service integration | `sync.service.test.ts` | enqueue + worker mock |
| Konflik UI | `SyncConflictModal.test.tsx`, `SyncConflictBanner.test.tsx` | SCR-CF-01…06 |
| Hold offline | `offline-hold.test.ts` | SCR-HO-01…05 |
| Product cache | `product-cache.test.ts` | SCR-PC-01…06 |
| Regresi | `offline-sync.test.ts`, `OfflineBanner.test.tsx` | REG-S12-01…04 |

**Gate merge:** P0 automated untuk BQ/CF/HO/PC minimal ter-cover sebelum UAT final.

---

## UAT Checklist Draft (Sprint 12 Close)

> Checklist untuk **Pak Zaki** — eksekusi manual di staging setelah tim QA + dev sign-off teknis.

### Prasyarat UAT

- [ ] Redis + API + web staging (**Yoga**)
- [ ] Seed outlet `MAIN` + produk aktif (≥20 SKU)
- [ ] Akun kasir + manager + shift terbuka
- [ ] Sprint 11 regression smoke PASS

### Skenario bisnis (P0)

- [ ] **UAT-01** — Transaksi offline tetap masuk antrean; setelah online, **worker BullMQ** memproses tanpa duplikat.
- [ ] **UAT-02** — Saat stok tidak cukup saat sync, kasir melihat **banner/modal konflik** dan bisa batalkan atau sesuaikan qty.
- [ ] **UAT-03** — Hold transaksi saat offline; setelah online, hold muncul di server dan bisa di-recall.
- [ ] **UAT-04** — Buka kasir offline: **grid produk tetap tampil** dari cache; pencarian jalan.
- [ ] **UAT-05** — Harga naik di server saat kasir offline: sync menolak dengan pesan jelas (bukan transaksi diam-diam salah harga).
- [ ] **UAT-06** — Dua konflik berurutan dapat diselesaikan satu per satu tanpa refresh paksa.

### Integrasi & regresi (P1)

- [ ] **UAT-07** — Banner offline + banner konflik tidak saling menutupi tombol Bayar.
- [ ] **UAT-08** — Void & struk transaksi **online** (Sprint 10) tetap berfungsi.
- [ ] **UAT-09** — Split payment offline → sync (Sprint 11) tetap PASS.
- [ ] **UAT-10** — Pesan error seluruh alur baru **Bahasa Indonesia**.

### Ops (P1 — Yoga)

- [ ] **UAT-11** — Queue depth / failed jobs terpantau di staging.
- [ ] **UAT-12** — Redis restart: antrean tidak hilang; worker lanjut setelah Redis up.

### Sign-off

| Peran | Nama | Tanggal | Go / No-go |
|-------|------|---------|------------|
| QA | Citra | | |
| Backend | Fajar | | |
| DevOps | Yoga | | |
| Frontend | Dimas | | |
| CEO | Budi | | |
| Pemilik | Pak Zaki | | |

---

## Defect Severity (Sprint 12)

| Severity | Contoh | Block close? |
|----------|--------|--------------|
| P0 | Worker tidak jalan; duplikat transaksi; konflik tidak terlihat kasir; hold hilang; checkout offline tanpa produk | Ya |
| P1 | Retry terlalu agresif; copy konflik membingungkan; cache tidak refresh | Waiver CEO |
| P2 | Metrik ops; animasi modal | Tidak |

---

## Handoff Log

| Field | Isi |
|-------|-----|
| **From** | Citra · QA Engineer |
| **To** | Fajar · Senior Developer, Yoga · DevOps, Dimas · Senior Frontend |
| **Task** | Test plan Sprint 12 — BullMQ, konflik UI, hold offline, product cache |
| **Deliverable** | `docs/testing/SPRINT-12-TEST-PLAN.md` (46 TC + 12 UAT draft) |
| **Blocked by** | — (draft parallel OK; AC dari S11 closure + OFFLINE-SYNC) |
| **Parallel OK?** | Ya — eksekusi UAT tunggu staging + Redis + UI/modul target |
| **Next action** | Implement + automated SCR-BQ/CF/HO/PC; notify Citra saat build staging ready |

---

## Changelog Dokumen

| Tanggal | Versi | Perubahan |
|---------|-------|-----------|
| 2026-06-02 | 1.0 | Draft awal — 46 test case + 12 UAT item (parallel QA Sprint 12) |
