> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Testing | Audience: Pak Zaki, Citra, Fajar, Dimas, Yoga, Budi, Fitri

# Sprint 12 — UAT Final Checklist

> **Tanggal:** 2 Juni 2026  
> **Status:** **CLOSED** — tervalidasi tanpa blocker P0  
> **Owner uji:** Citra (QA), Fajar (Backend/API), Dimas (Frontend), Yoga (DevOps), Budi (Orchestrator)

---

## Scope UAT Final

1. **BullMQ worker** — replay sync via Redis; label `bullmq` | `inline-fallback`; retry 3× backoff 2s.
2. **Redis health** — `GET /health` → `services.redis` (`up` | `down` | `disabled`).
3. **Hold/recall sync API** — operasi `HOLD_BILL` / `RECALL_HOLD` di `POST /sync/queue` (spike MVP).
4. **UI konflik** — banner/modal kasir konsumsi `GET /sync/conflicts`; aksi resolve manual.
5. **Hold offline PWA** — antrean IndexedDB + drain ke API saat online.
6. **Katalog cache (MVP)** — snapshot grid produk read-only saat offline.
7. **Regresi Sprint 11** — antrean checkout, idempotensi `clientRequestId`, PWA shell, void/struk.

---

## Hasil Eksekusi Ringkas

| Area | Hasil | Bukti utama |
|------|-------|-------------|
| BullMQ enqueue + replay | ✅ PASS | SCR-S12-01 … SCR-S12-05, `sync.s12.test.ts` |
| Redis health | ✅ PASS | SCR-S12-06, SCR-S12-07, `health.s12.test.ts` |
| HOLD_BILL / RECALL_HOLD replay | ✅ PASS | SCR-S12-02 … SCR-S12-04 |
| Regresi sync Sprint 11 | ✅ PASS | SCR-O01 … SCR-O06 |
| UI konflik + banner offline | ✅ PASS | `OfflineBanner.test.tsx`, `sync-conflicts.test.ts` |
| Hold IndexedDB + sync | ✅ PASS | `offline-hold-queue.test.ts`, `offline-hold-sync.test.ts` |
| Katalog cache offline | ✅ PASS | `catalog-cache.test.ts`, `page.offline.test.tsx` |
| Integrasi kasir `/pos` | ✅ PASS | `page.test.tsx`, `page.offline.test.tsx` |
| Regresi void/struk | ✅ PASS | SCR-V01 … SCR-V06 di suite API |

---

## Bukti Verifikasi Teknis (Re-run Final — 2 Juni 2026)

### API (`@barokah/api`)

| Perintah | Hasil |
|----------|-------|
| `npm run lint -w @barokah/api` | ✅ |
| `npm run typecheck -w @barokah/api` | ✅ |
| `npm run test -w @barokah/api` | ✅ **68/68** |
| `npm run build -w @barokah/api` | ✅ |

### Web (`@barokah/web`)

| Perintah | Hasil |
|----------|-------|
| `npm run lint -w @barokah/web` | ✅ |
| `npm run typecheck -w @barokah/web` | ✅ |
| `npm run test -w @barokah/web` | ✅ **57/57** |
| `npm run build -w @barokah/web` | ✅ (⚠ warning ESLint plugin Next.js — non-blocking, carry-over) |

**Prasyarat Redis (SCR-BQ manual):** `npm run docker:up` → Redis `localhost:6379`. Tanpa Redis: processor `inline-fallback` (CI memakai `REDIS_DISABLED=true`).

---

## Checklist UAT Final (Pak Zaki)

- [x] `GET /health` menampilkan status Redis (`up` / `down` / `disabled`).
- [x] `POST /sync/queue` dengan Redis aktif → `processor: bullmq` di status.
- [x] Login **kasir** → `/pos` → DevTools **Offline** → checkout tunai masuk antrean + banner pending.
- [x] **Online** → auto-sync / **Sinkronkan Sekarang** → transaksi di **Transaksi Terakhir**.
- [x] Simulasi konflik stok → entri muncul di banner konflik (`GET /conflicts`).
- [x] Hold bill offline (spike) → antrean hold drain saat online.
- [x] Grid produk usable offline setelah snapshot cache (read-only).
- [x] Regresi void + struk Sprint 10 masih hijau di suite API.

---

## Yang Bisa Langsung Dites (Dev)

**Prasyarat:** API port **3000**, web port **3001**, PostgreSQL + Redis + seed (`npm run docker:up` + `npm run db:seed`).

| Layar / Endpoint | URL |
|------------------|-----|
| Login | http://localhost:3001/login |
| Kasir PWA | http://localhost:3001/pos |
| Health | http://localhost:3000/health |
| Sync queue | http://localhost:3000/api/v1/sync/queue |
| Sync status | http://localhost:3000/api/v1/sync/status |
| Sync conflicts | http://localhost:3000/api/v1/sync/conflicts |

**Kredensial dev:** `kasir@barokah.local` / `Kasir123!` — buka shift sebelum checkout/hold.

**Dev aman port bentrok:** `npm run dev:api:clean` · `npm run dev:web:clean` (port 3001).

---

## Item Defer (Non-blocking)

| Item | Sprint berikutnya |
|------|-------------------|
| Hold idempotency penuh (`clientRequestId` di API hold) | Sprint 13 Track A |
| BullMQ observability / dashboard | Sprint 13+ |
| Katalog delta `GET /catalog/snapshot` | Sprint 13+ |
| Void/refund dari antrean offline | Defer |
| Epic J — implementasi storefront | Sprint 13 Track B — **blocked Q-J01–Q-J08** |
| Printer thermal fisik | Fase 2 |

---

## Keputusan QA

**Sprint 12 dinyatakan CLOSED (gabungan)** — lane backend/DevOps + frontend + QA deliverable P0 tervalidasi; tidak ada blocker deploy staging.

**Referensi:** [SPRINT-12-TEST-PLAN.md](./SPRINT-12-TEST-PLAN.md), [SPRINT-12-CLOSURE.md](../sprint/SPRINT-12-CLOSURE.md), [SPRINT-12-PLAN.md](../requirements/SPRINT-12-PLAN.md), [docs/api/SYNC.md](../api/SYNC.md), [algorithm/OFFLINE-SYNC.md](../algorithm/OFFLINE-SYNC.md), [EPIC-J-ONLINE-STOREFRONT-DISCOVERY.md](../requirements/EPIC-J-ONLINE-STOREFRONT-DISCOVERY.md)
