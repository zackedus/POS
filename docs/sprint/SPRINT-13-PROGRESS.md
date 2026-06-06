> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Sprint Progress | Audience: Pak Zaki, Budi, Hendra, Fajar, Dimas, Yoga, Citra

# Sprint 13 — Progress (Offline Polish + Epic J Gate)

> **Tanggal update:** 5 Juni 2026  
> **Status sprint:** **CLOSED** — UAT PASS, tidak ada blocker P0  
> **Plan:** [SPRINT-13-PLAN.md](../requirements/SPRINT-13-PLAN.md) · **UAT:** [SPRINT-13-UAT-FINAL.md](../testing/SPRINT-13-UAT-FINAL.md) · **Closure:** [SPRINT-13-CLOSURE.md](./SPRINT-13-CLOSURE.md)

---

## Status Ringkas

| Jalur | Owner | Progress | Status |
|-------|-------|----------|--------|
| **Track A — Backend** | **Fajar + Andi** | 100% | ✅ CLOSED |
| **Track A — Frontend PWA** | **Dimas + Bima** | 100% | ✅ CLOSED |
| **Track B — Epic J** | **Fajar + Dimas** | 100% (scaffold) | ✅ CLOSED — mock scope |
| **QA** | **Citra** | 100% | ✅ [SPRINT-13-UAT-FINAL.md](../testing/SPRINT-13-UAT-FINAL.md) PASS |

---

## Track A — Deliverables

| # | Item | Status | Catatan |
|---|------|--------|---------|
| A1 | Hold `clientRequestId` idempotent di API | ✅ **DONE** | Migration `20260602200000_sprint13_hold_client_request_id`; `POST /transactions/hold` + replay `HOLD_BILL` |
| A2 | Wire idempotency hold di PWA | ✅ **DONE** | `offline-hold-sync.ts` kirim `clientRequestId` ke `POST /transactions/hold` |
| A3 | BullMQ polish (failed logging + metric di status) | ✅ **DONE** | `GET /sync/status` field `bullmq` saat Redis aktif; log jobId + attempt |
| A4 | Katalog delta API | ⏳ **Defer evaluasi** | P2 — carry Sprint 14 |
| A5 | Regression SCR-S12 + SCR-O* + SCR-V* | ✅ **DONE** | Citra UAT 5 Jun — API 69/69, web 59/59 |

---

## Track A — Detail Implementasi (2 Juni 2026)

### A1 — Hold idempotency API

- Kolom `held_transactions.client_request_id` + unique `(outlet_id, client_request_id)`.
- `HoldTransactionDto.clientRequestId` opsional (min 8 karakter).
- `TransactionsService.holdTransaction`: lookup idempotent, race-safe `P2002`, response `idempotentReplay: boolean`.
- `SyncQueueProcessor`: operasi `HOLD_BILL` meneruskan `row.clientRequestId` ke service.

**Verifikasi:** unit test `holdTransaction returns existing hold by clientRequestId` + SCR-S12-02 assert `clientRequestId` pada replay.

### A2 — Hold idempotency PWA (`offline-hold-sync.ts`)

- `syncOfflineHoldEntry` mengirim `clientRequestId` dari `entry.payload.clientRequestId` (fallback `entry.id`) pada body `POST /transactions/hold`.
- Selaras antrean IndexedDB (`offline-hold-queue`) yang sudah menyimpan `clientRequestId` = `entry.id`.

**Verifikasi:** `apps/web/src/lib/offline-hold-sync.test.ts` — assert body menyertakan `clientRequestId`.

### A3 — BullMQ monitoring polish

- `SyncReplayDispatcher.getQueueMetrics()` — counts waiting/active/failed/completed.
- `GET /sync/status` menambahkan `bullmq: { waiting, active, failed, completed }` bila worker Redis aktif.
- Log job gagal: `jobId`, `outletId`, `attemptsMade`.

---

## Verifikasi Teknis

### `@barokah/api` (5 Juni 2026 — UAT final)

| Perintah | Hasil |
|----------|-------|
| `npm run test -w @barokah/api` | ✅ **69/69 PASS** |
| `npm run lint -w @barokah/api` | ✅ |
| `npm run typecheck -w @barokah/api` | ✅ |
| `npm run build -w @barokah/api` | ✅ |

> **Catatan migrasi:** jalankan `npx prisma migrate deploy` di lingkungan dev/staging setelah pull.

### `@barokah/web` (5 Juni 2026 — UAT final)

| Perintah | Hasil |
|----------|-------|
| `npm run test -w @barokah/web -- --run` | ✅ **59/59 PASS** |
| `npm run test -w @barokah/web -- --run src/lib/offline src/lib/store` | ✅ **10/10 PASS** |
| `npm run lint -w @barokah/web` | ✅ |
| `npm run typecheck -w @barokah/web` | ✅ |

---

## Track B — Epic J

| Item | Status |
|------|--------|
| Q-J01 … Q-J08 | ✅ Terkunci [ADR-004](../decisions/ADR-004-EPIC-J-DEFAULTS-LOCKED.md) |
| User story US-J-* | ✅ [EPIC-J-USER-STORIES.md](../requirements/EPIC-J-USER-STORIES.md) |
| Wireframe storefront | ✅ [WIREFRAMES-STOREFRONT.md](../design/WIREFRAMES-STOREFRONT.md) — approved Maya |
| RFC API `online_orders` | ✅ [ONLINE-ORDERS-RFC.md](../api/ONLINE-ORDERS-RFC.md) — **APPROVED** (Eko + Arif sign-off 5 Jun) |
| Skeleton `/store/[slug]` | ✅ **DONE** — katalog, PDP, keranjang, checkout pickup, konfirmasi order (mock API) |
| Modul API `online_orders` | ⏳ **Sprint 14** | Prisma migrasi + NestJS post-UAT |

### Scaffold storefront (5 Juni 2026 — Dimas)

Route `apps/web/src/app/store/[slug]/`:

| Route | Layar | Catatan |
|-------|-------|---------|
| `/store/[slug]` | SCR-J01 Katalog | Mock produk; filter kategori & outlet |
| `/store/[slug]/p/[productId]` | SCR-J02 PDP | MOQ/kelipatan; tambah keranjang |
| `/store/[slug]/cart` | SCR-J03 Keranjang | localStorage 24 jam; PPN 11% |
| `/store/[slug]/checkout` | SCR-J04 Checkout pickup | Form guest; validasi stok mock |
| `/store/[slug]/order/[orderId]/success` | SCR-J06 Konfirmasi | Mock redirect post-checkout |

Lib pendukung: `apps/web/src/lib/store/` (mock-api, cart-context, pricing).  
Komponen: `apps/web/src/components/store/`.

**UAT:** SCR-S13-J01–J10 PASS (mock scope). Snap Midtrans live, webhook, antrian kasir US-J-07 → Sprint 14.

---

## Handoff Log

| From | To | Task | Next action |
|------|-----|------|-------------|
| Citra | Budi | UAT Sprint 13 final | Closure + lapor Pak Zaki |
| Fajar | Andi | Sprint 14 — modul `online_orders` | Prisma migrasi post-closure |
| Dimas | Bima | Wire storefront ke API live | Setelah contract Fajar freeze |
| Budi | Fitri | Update INDEX + closure docs | Cross-link UAT S13 |

---

## Referensi

- [SPRINT-13-PLAN.md](../requirements/SPRINT-13-PLAN.md)
- [SPRINT-13-TEST-PLAN.md](../testing/SPRINT-13-TEST-PLAN.md)
- [SPRINT-13-UAT-FINAL.md](../testing/SPRINT-13-UAT-FINAL.md)
- [SPRINT-13-CLOSURE.md](./SPRINT-13-CLOSURE.md)
- [ONLINE-ORDERS-RFC.md](../api/ONLINE-ORDERS-RFC.md)
- [WIREFRAMES-STOREFRONT.md](../design/WIREFRAMES-STOREFRONT.md)
