> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Requirements | Audience: Pak Zaki, Budi, Hendra, Fajar, Dimas

# Sprint 11 Plan — Offline PWA Foundation (Fase 2 Growth)

> **Periode:** 2 Juni 2026  
> **Status:** **CLOSED** (gabungan algorithm + backend + frontend + QA) → [SPRINT-11-CLOSURE.md](../sprint/SPRINT-11-CLOSURE.md)  
> **Owner backend:** Fajar Ramadhan (API) + Andi Kurniawan (parallel tests/docs)  
> **Owner frontend:** Dimas Pratama + Bima Saputra (PWA)  
> **Owner QA:** Citra Lestari · **Algorithm:** Eko Susilo  
> **Carry-over:** [SPRINT-10-CLOSURE.md](../sprint/SPRINT-10-CLOSURE.md)  
> **Scope produk:** Retail toko fisik — **no F&B** ([ADR-003](../decisions/ADR-003-SCOPE-RETAIL-ONLINE-OFFLINE.md))

---

## Tujuan Sprint 11 (Gabungan)

1. **Sync queue API** — terima transaksi antrian client dengan `clientRequestId` idempotent.
2. **Status & konflik** — `GET` ringkasan antrian + daftar `CONFLICT` untuk resolve manual.
3. **Replay processor stub** — in-process replay ke `checkoutCash` / `checkoutSplit` (BullMQ defer).
4. **PWA kasir** — manifest, SW, IndexedDB queue, banner offline, sinkron via `POST /sync/queue`.
5. **Kebijakan konflik** — [OFFLINE-SYNC.md](../algorithm/OFFLINE-SYNC.md) (Eko).
6. **Test SCR-O01+ / 38 TC QA** dan verifikasi `@barokah/api` + `@barokah/web`.

---

## Scope In (Backend)

| # | Deliverable |
|---|-------------|
| 1 | `POST /api/v1/sync/queue` — batch enqueue + replay stub |
| 2 | `GET /api/v1/sync/status` — counts per status |
| 3 | `GET /api/v1/sync/conflicts` — pending conflicts |
| 4 | Prisma `sync_queue_entries` + migration |
| 5 | `ErrorCodes` sync: `SYNC_CONFLICT`, `SYNC_INVALID_PAYLOAD`, `SYNC_QUEUE_NOT_FOUND` |
| 6 | Test SCR-O01 … SCR-O06 + RBAC smoke sync |
| 7 | API doc [SYNC.md](../api/SYNC.md) |

## Scope Out (Defer — Non-blocking)

- BullMQ + Redis worker production (Yoga + Fajar — Sprint 12).
- Hold/recall offline, master data cache penuh, void/refund offline.
- Online storefront Epic J (Rina → Dewi → Maya gate).
- Expo mobile offline queue.

---

## Acceptance Criteria

- [x] Enqueue idempotent pada `outletId` + `clientRequestId`.
- [x] Replay memanggil checkout existing; transaksi duplikat via `clientRequestId` tidak double-charge stok.
- [x] Konflik bisnis (stok/shift) → status `CONFLICT` + muncul di `GET /conflicts`.
- [x] Kasir boleh akses semua endpoint sync (tanpa role method-level).
- [x] `@barokah/api` lint, typecheck, test, build lulus.
- [x] PWA `/pos` antre offline + sync via `/sync/queue`.
- [x] `@barokah/web` lint, typecheck, test, build lulus.
- [x] UAT final PASS — [SPRINT-11-UAT-FINAL.md](../testing/SPRINT-11-UAT-FINAL.md).

---

## Handoff

| From | To | Task |
|------|-----|------|
| Fajar | Dimas | Konsumsi `/sync/*` dari PWA queue + banner status |
| Fajar | Eko | Review conflict policy server-wins (stok) |
| Fajar | Yoga | BullMQ wiring saat Redis staging ready |
| Fajar | Fitri | INDEX + ERROR-CODES sync section |
