> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Testing | Audience: Pak Zaki, Citra, Fajar, Dimas, Budi, Fitri

# Sprint 13 — Test Plan (Hold Idempotency · BullMQ Metrics · Storefront Scaffold)

> **Tanggal:** 5 Juni 2026  
> **Status:** **CLOSED** — UAT final PASS 5 Juni 2026  
> **Owner QA:** Citra Lestari (`@qa`)  
> **Jalur:** Track A (**Fajar + Dimas**) · Track B (**Dimas** scaffold guest UI)

**Referensi:** [SPRINT-13-PROGRESS.md](../sprint/SPRINT-13-PROGRESS.md), [SPRINT-12-TEST-PLAN.md](./SPRINT-12-TEST-PLAN.md), [ONLINE-ORDERS-RFC.md](../api/ONLINE-ORDERS-RFC.md), [WIREFRAMES-STOREFRONT.md](../design/WIREFRAMES-STOREFRONT.md), [SYNC.md](../api/SYNC.md)

---

## Ringkasan

| Metrik | Nilai |
|--------|-------|
| **Total test case fungsional** | **28** |
| Breakdown — Hold idempotency API (SCR-S13-H) | 8 |
| Breakdown — Hold idempotency PWA (SCR-S13-P) | 4 |
| Breakdown — BullMQ metrics (SCR-S13-B) | 6 |
| Breakdown — Storefront scaffold smoke (SCR-S13-J) | 10 |
| **Regresi wajib Sprint 12** | SCR-BQ, SCR-O*, SCR-CF smoke |

---

## Scope Uji

### Dalam scope Sprint 13 (P0)

1. **Hold `clientRequestId` idempotent** — `POST /transactions/hold` replay; kolom DB + response `idempotentReplay`.
2. **PWA hold sync** — `offline-hold-sync.ts` mengirim `clientRequestId` ke API.
3. **BullMQ metrics** — `GET /sync/status` field `bullmq` saat Redis aktif.
4. **Storefront scaffold** — route `/store/[slug]` guest UI dengan mock data (belum API `online_orders`).

### Di luar scope (Sprint 14)

- Modul NestJS `online_orders` + migrasi Prisma.
- Webhook Midtrans online produksi.
- Integrasi Snap Midtrans live.
- Antrian fulfillment kasir (US-J-07 UI).
- Delivery checkout (US-J-05 P1).

---

## Prasyarat & Lingkungan

| Item | Nilai |
|------|-------|
| API | `http://localhost:3000/api/v1` |
| Web kasir | `http://localhost:3001/pos` |
| Storefront | `http://localhost:3001/store/toko-bangun-jaya` |
| Redis | `redis://localhost:6379` (wajib SCR-S13-B) |
| DB | PostgreSQL + `npm run db:seed` |
| Kredensial | `kasir@barokah.local` / `Kasir123!` |
| Shift | Buka shift aktif sebelum hold/checkout kasir |

---

## Track A — Hold Idempotency API (SCR-S13-H)

| ID | Kasus | Langkah | Ekspektasi |
|----|-------|---------|------------|
| SCR-S13-H01 | Hold pertama dengan `clientRequestId` | `POST /transactions/hold` body `{ clientRequestId: "hold-req-001", items: [...] }` | `201`; `idempotentReplay: false`; `id` hold baru |
| SCR-S13-H02 | Replay hold sama | Ulangi request identik `clientRequestId` | `200/201`; `idempotentReplay: true`; `id` sama dengan H01 |
| SCR-S13-H03 | Race P2002 | Dua request paralel `clientRequestId` sama | Satu create; satu replay — tidak double hold |
| SCR-S13-H04 | Tanpa `clientRequestId` | Hold tanpa field | Berhasil; tidak idempotent lookup |
| SCR-S13-H05 | `clientRequestId` terlalu pendek | `< 8` karakter | `422 VALIDATION_FAILED` |
| SCR-S13-H06 | HOLD_BILL sync replay | Enqueue `HOLD_BILL` dengan `clientRequestId` duplikat | Processor tidak double hold |
| SCR-S13-H07 | Unit test regression | `npm run test -w @barokah/api` — `holdTransaction returns existing hold` | PASS |
| SCR-S13-H08 | Migrasi kolom | Cek `held_transactions.client_request_id` unique per outlet | Constraint `(outlet_id, client_request_id)` |

---

## Track A — Hold Idempotency PWA (SCR-S13-P)

| ID | Kasus | Langkah | Ekspektasi |
|----|-------|---------|------------|
| SCR-S13-P01 | Body sync hold | Offline hold sync ke API | Body menyertakan `clientRequestId` |
| SCR-S13-P02 | Fallback `entry.id` | Entry tanpa payload `clientRequestId` | Gunakan `entry.id` sebagai fallback |
| SCR-S13-P03 | Unit test | `offline-hold-sync.test.ts` | PASS |
| SCR-S13-P04 | Replay antrean | Sync ulang entry sama setelah online | Tidak duplikat hold di server |

---

## Track A — BullMQ Metrics (SCR-S13-B)

| ID | Kasus | Langkah | Ekspektasi |
|----|-------|---------|------------|
| SCR-S13-B01 | Status tanpa Redis | `GET /sync/status` inline-fallback | Tidak ada field `bullmq` |
| SCR-S13-B02 | Status dengan Redis | Worker BullMQ aktif; `GET /sync/status` | `bullmq: { waiting, active, failed, completed }` numerik |
| SCR-S13-B03 | Job gagal log | Paksa job gagal | Log berisi `jobId`, `outletId`, `attemptsMade` |
| SCR-S13-B04 | Processor label | Status response | `processor: bullmq` saat Redis aktif |
| SCR-S13-B05 | Regresi SCR-BQ | Ulangi SCR-BQ01–06 dari Sprint 12 | PASS |
| SCR-S13-B06 | Unit test sync service | `sync.service.test.ts` SCR-O03 | Queue counts tetap benar |

---

## Track B — Storefront Scaffold Smoke (SCR-S13-J)

| ID | Kasus | Layar | Ekspektasi |
|----|-------|-------|------------|
| SCR-S13-J01 | Katalog load | SCR-J01 `/store/[slug]` | Grid produk mock; filter kategori; badge stok |
| SCR-S13-J02 | Pencarian | SCR-J01 | Filter nama/SKU client-side |
| SCR-S13-J03 | PDP | SCR-J02 `/p/[productId]` | MOQ/kelipatan; CTA tambah keranjang |
| SCR-S13-J04 | Keranjang persist | SCR-J03 | localStorage 24 jam; PPN 11% breakdown |
| SCR-S13-J05 | Validasi qty | SCR-J03 | Toast/block jika melebihi stok mock |
| SCR-S13-J06 | Checkout pickup | SCR-J04 | Pilih cabang; form nama+HP wajib |
| SCR-S13-J07 | Stok tidak cukup | SCR-J04 | Banner item bermasalah saat ganti cabang |
| SCR-S13-J08 | Mock payment redirect | SCR-J05→J06 | Redirect ke halaman konfirmasi order WEB-* |
| SCR-S13-J09 | Guest tanpa login | Semua layar | Tidak ada redirect ke `/login` |
| SCR-S13-J10 | Unit test pricing | `store/pricing.test.ts` | Subtotal + PPN 11% = total wireframe |

---

## Regresi Wajib (smoke)

| Area | Perintah / kasus | Gate |
|------|------------------|------|
| API unit | `npm run test -w @barokah/api` | 69/69 PASS |
| Web offline lib | `npm run test -w @barokah/web -- --run src/lib/offline` | 8/8 PASS |
| Web store lib | `npm run test -w @barokah/web -- --run src/lib/store` | PASS |
| API build | `npm run build -w @barokah/api` | PASS |
| Sprint 12 SCR-O01–06 | Sync queue idempotency | PASS |

---

## UAT Checklist Draft (Sprint 13 close)

| # | Item | Track | Status |
|---|------|-------|--------|
| 1 | Hold replay `clientRequestId` tidak duplikat | A | ✅ |
| 2 | PWA kirim `clientRequestId` pada sync hold | A | ✅ |
| 3 | `GET /sync/status` menampilkan `bullmq` metrics | A | ✅ |
| 4 | Regresi Sprint 12 sync/konflik smoke | A | ✅ |
| 5 | RFC `ONLINE-ORDERS-RFC.md` APPROVED | B | ✅ |
| 6 | Skeleton `/store/[slug]` sesuai wireframe | B | ✅ |
| 7 | Guest checkout UI (mock) end-to-end | B | ✅ |
| 8 | API `online_orders` — defer Sprint 14 | B | N/A |

---

*Disusun: Citra Lestari (QA) · koordinasi Fajar + Dimas · 5 Juni 2026*
