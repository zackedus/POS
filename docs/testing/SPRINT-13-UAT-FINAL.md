> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Testing | Audience: Pak Zaki, Citra, Fajar, Dimas, Yoga, Budi, Fitri

# Sprint 13 — UAT Final Checklist

> **Tanggal:** 5 Juni 2026  
> **Status:** **CLOSED** — tervalidasi tanpa blocker P0  
> **Owner uji:** Citra (QA), Fajar (Backend/API), Dimas (Frontend), Yoga (DevOps), Budi (Orchestrator)

---

## Scope UAT Final

1. **Hold idempotency API** — `POST /transactions/hold` replay via `clientRequestId`; kolom DB + response `idempotentReplay`.
2. **Hold idempotency PWA** — `offline-hold-sync.ts` mengirim `clientRequestId` ke API.
3. **BullMQ metrics** — `GET /sync/status` field `bullmq` saat Redis aktif.
4. **Storefront scaffold (Epic J)** — route `/store/[slug]` guest UI dengan mock data (belum API `online_orders`).
5. **Regresi Sprint 12** — SCR-O01–06, SCR-S12-01–05, SCR-V*, offline PWA smoke.

---

## Hasil Eksekusi Ringkas

| Area | Hasil | Bukti utama |
|------|-------|-------------|
| Hold idempotency API (SCR-S13-H) | ✅ PASS | `transactions.service.test.ts` (1 TC), migrasi `20260602200000_sprint13_hold_client_request_id` |
| Hold idempotency PWA (SCR-S13-P) | ✅ PASS | `offline-hold-sync.test.ts` (1/1), `offline-hold-sync.ts` |
| BullMQ metrics (SCR-S13-B) | ✅ PASS | `sync.s12.test.ts` SCR-S12-05, `sync.service.test.ts` SCR-O03 |
| Storefront scaffold (SCR-S13-J) | ✅ PASS | Route `apps/web/src/app/store/[slug]/`, `store/pricing.test.ts` (2/2) |
| Regresi Sprint 12 sync/konflik | ✅ PASS | `sync.service.test.ts` SCR-O01–06, `sync.s12.test.ts` |
| Regresi offline PWA kasir | ✅ PASS | `offline-hold-queue.test.ts`, `page.offline.test.tsx`, `OfflineBanner.test.tsx` |

---

## Bukti Verifikasi Teknis (Re-run Final — 5 Juni 2026)

### API (`@barokah/api`)

| Perintah | Hasil |
|----------|-------|
| `npm run lint -w @barokah/api` | ✅ |
| `npm run typecheck -w @barokah/api` | ✅ |
| `npm run test -w @barokah/api` | ✅ **69/69** |
| `npm run build -w @barokah/api` | ✅ |

### Web (`@barokah/web`)

| Perintah | Hasil |
|----------|-------|
| `npm run lint -w @barokah/web` | ✅ |
| `npm run typecheck -w @barokah/web` | ✅ |
| `npm run test -w @barokah/web -- --run` | ✅ **59/59** |
| `npm run test -w @barokah/web -- --run src/lib/offline src/lib/store` | ✅ **10/10** (offline 8 + store 2) |

**Perbaikan minor selama UAT:** `dashboard/page.test.tsx` — assert tanggal ekspor memakai `todayIsoDate()` (flake tanggal hardcoded, non-P0).

**Prasyarat Redis (SCR-S13-B manual):** `npm run docker:up` → Redis `localhost:6379`. Tanpa Redis: processor `inline-fallback`, field `bullmq` tidak muncul (CI memakai `REDIS_DISABLED=true`).

---

## Mapping Test Case → Hasil

### Track A — Hold Idempotency API (SCR-S13-H)

| ID | Hasil | Bukti |
|----|-------|-------|
| SCR-S13-H01 | ✅ PASS | `transactions.service.test.ts` — hold baru; `idempotentReplay: false` pada path create (SCR-S12-02) |
| SCR-S13-H02 | ✅ PASS | `transactions.service.test.ts` — `holdTransaction returns existing hold by clientRequestId`; `idempotentReplay: true` |
| SCR-S13-H03 | ✅ PASS | `transactions.service.ts` — handler `P2002` race-safe; replay lookup setelah unique violation |
| SCR-S13-H04 | ✅ PASS | `HoldTransactionDto.clientRequestId` opsional; service skip lookup bila kosong |
| SCR-S13-H05 | ✅ PASS | `hold-transaction.dto.ts` — `@MinLength(8)` → `422 VALIDATION_FAILED` via ValidationPipe |
| SCR-S13-H06 | ✅ PASS | `sync.s12.test.ts` SCR-S12-02 — `HOLD_BILL` meneruskan `clientRequestId` ke `holdTransaction` |
| SCR-S13-H07 | ✅ PASS | `transactions.service.test.ts` — TC #61/69 PASS |
| SCR-S13-H08 | ✅ PASS | Migrasi `held_transactions_outlet_id_client_request_id_key` unique `(outlet_id, client_request_id)` |

### Track A — Hold Idempotency PWA (SCR-S13-P)

| ID | Hasil | Bukti |
|----|-------|-------|
| SCR-S13-P01 | ✅ PASS | `offline-hold-sync.test.ts` — body POST menyertakan `clientRequestId` |
| SCR-S13-P02 | ✅ PASS | `offline-hold-sync.ts` L43 — `entry.payload.clientRequestId ?? entry.id` |
| SCR-S13-P03 | ✅ PASS | `offline-hold-sync.test.ts` — **1/1 PASS** |
| SCR-S13-P04 | ✅ PASS | Rantai idempotensi API (H02 + H06) — replay antrean tidak duplikat hold server |

### Track A — BullMQ Metrics (SCR-S13-B)

| ID | Hasil | Bukti |
|----|-------|-------|
| SCR-S13-B01 | ✅ PASS | `sync.service.test.ts` SCR-O03 — dispatcher `inline-fallback` tanpa `getQueueMetrics` → tidak ada field `bullmq` |
| SCR-S13-B02 | ✅ PASS | `sync.s12.test.ts` SCR-S12-05 — `bullmq: { waiting, active, failed, completed }` |
| SCR-S13-B03 | ✅ PASS | `sync-replay.dispatcher.ts` — log job gagal: `jobId`, `outletId`, `attemptsMade` (verifikasi kode; smoke manual opsional) |
| SCR-S13-B04 | ✅ PASS | `sync.s12.test.ts` SCR-S12-05 — `processor: bullmq` |
| SCR-S13-B05 | ✅ PASS | `sync.service.test.ts` SCR-O01–06 + `sync.s12.test.ts` SCR-S12-01–04 — **6/6 PASS** |
| SCR-S13-B06 | ✅ PASS | `sync.service.test.ts` SCR-O03 — queue counts + pending total |

### Track B — Storefront Scaffold Smoke (SCR-S13-J)

| ID | Hasil | Bukti |
|----|-------|-------|
| SCR-S13-J01 | ✅ PASS (mock) | Route `/store/[slug]/page.tsx` — grid mock, filter kategori & outlet |
| SCR-S13-J02 | ✅ PASS (mock) | `page.tsx` — filter client-side `q` pada `getProducts()` |
| SCR-S13-J03 | ✅ PASS (mock) | Route `/store/[slug]/p/[productId]/page.tsx` — MOQ/kelipatan, CTA keranjang |
| SCR-S13-J04 | ✅ PASS (mock) | Route `/store/[slug]/cart/page.tsx` + `cart-context.tsx` — localStorage 24 jam, PPN 11% |
| SCR-S13-J05 | ✅ PASS (mock) | `cart/page.tsx` — validasi qty vs stok mock |
| SCR-S13-J06 | ✅ PASS (mock) | Route `/store/[slug]/checkout/page.tsx` — pickup, form guest nama+HP |
| SCR-S13-J07 | ✅ PASS (mock) | `checkout/page.tsx` — banner stok tidak cukup saat ganti cabang |
| SCR-S13-J08 | ✅ PASS (mock) | Redirect ke `/store/[slug]/order/[orderId]/success` — mock order WEB-* |
| SCR-S13-J09 | ✅ PASS (mock) | Layout storefront tanpa guard auth — guest akses semua layar |
| SCR-S13-J10 | ✅ PASS | `store/pricing.test.ts` — subtotal + PPN 11% = total (**2/2 PASS**) |

> **Catatan Track B:** TC J01–J09 diverifikasi pada **scaffold mock** sesuai scope Sprint 13. Integrasi API `online_orders` live → **N/A** (Sprint 14).

---

## Checklist UAT Final (Pak Zaki)

- [x] Hold replay `clientRequestId` tidak duplikat (API + sync queue).
- [x] PWA kirim `clientRequestId` pada sync hold offline.
- [x] `GET /sync/status` menampilkan `bullmq` metrics saat Redis aktif.
- [x] Regresi Sprint 12 sync/konflik smoke hijau (SCR-O*, SCR-S12-*).
- [x] RFC `ONLINE-ORDERS-RFC.md` **APPROVED**.
- [x] Skeleton `/store/[slug]` sesuai wireframe Maya (mock data).
- [x] Guest checkout UI mock end-to-end (katalog → keranjang → checkout → konfirmasi).
- [x] API `online_orders` — defer Sprint 14 (N/A, bukan blocker).

---

## Yang Bisa Langsung Dites (Dev)

**Prasyarat:** API port **3000**, web port **3001**, PostgreSQL + Redis + seed (`npm run docker:up` + `npm run db:seed`).

| Layar / Endpoint | URL |
|------------------|-----|
| Login kasir | http://localhost:3001/login |
| Kasir PWA | http://localhost:3001/pos |
| Storefront mock | http://localhost:3001/store/toko-bangun-jaya |
| PDP mock | http://localhost:3001/store/toko-bangun-jaya/p/prod-semen-40kg |
| Keranjang | http://localhost:3001/store/toko-bangun-jaya/cart |
| Checkout pickup | http://localhost:3001/store/toko-bangun-jaya/checkout |
| Sync status | http://localhost:3000/api/v1/sync/status |
| Hold API | http://localhost:3000/api/v1/transactions/hold |

**Kredensial dev:** `kasir@barokah.local` / `Kasir123!` — buka shift sebelum hold/checkout kasir.

**Dev aman port bentrok:** `npm run dev:api:clean` · `npm run dev:web:clean` (port 3001).

**Smoke manual hold idempotency:** POST hold dua kali dengan `clientRequestId` identik → respons kedua `idempotentReplay: true`, `id` sama.

---

## Item Defer (Non-blocking)

| Item | Sprint berikutnya |
|------|-------------------|
| Modul NestJS `online_orders` + migrasi Prisma | **Sprint 14** |
| Webhook Midtrans online produksi | Sprint 14 |
| Integrasi Snap Midtrans live | Sprint 14 |
| Antrian fulfillment kasir (US-J-07 UI) | Sprint 14 |
| Delivery checkout (US-J-05 P1) | Sprint 14+ |
| Katalog delta API `GET /catalog/snapshot` | Sprint 14 evaluasi |
| BullMQ dashboard Grafana / alert | Infra Yoga — carry-over opsional |
| Void/refund dari antrean offline | Defer |

---

## Keputusan QA

**Sprint 13 dinyatakan CLOSED (gabungan Track A + Track B scaffold).** Hold idempotency API+PWA, BullMQ metrics polish, dan storefront guest scaffold mock tervalidasi. Tidak ada blocker P0 deploy staging.

**Referensi:** [SPRINT-13-TEST-PLAN.md](./SPRINT-13-TEST-PLAN.md), [SPRINT-13-CLOSURE.md](../sprint/SPRINT-13-CLOSURE.md), [SPRINT-13-PLAN.md](../requirements/SPRINT-13-PLAN.md), [ONLINE-ORDERS-RFC.md](../api/ONLINE-ORDERS-RFC.md), [WIREFRAMES-STOREFRONT.md](../design/WIREFRAMES-STOREFRONT.md)
