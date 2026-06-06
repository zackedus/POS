> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Requirements | Audience: Pak Zaki, Budi, Hendra, Fajar, Dimas, Citra

# Sprint 14 Plan — Epic J Online Orders (API + Storefront Live)

> **Periode:** 5 Juni 2026 (kickoff)  
> **Status:** **CLOSED** — UAT PASS 5 Juni 2026  
> **Orchestrator:** Budi Santoso (CEO)  
> **Carry-over:** [SPRINT-13-CLOSURE.md](../sprint/SPRINT-13-CLOSURE.md)  
> **RFC:** [ONLINE-ORDERS-RFC.md](../api/ONLINE-ORDERS-RFC.md) (APPROVED)  
> **User stories:** [EPIC-J-USER-STORIES.md](./EPIC-J-USER-STORIES.md) (US-J-01 … US-J-07)

---

## Ringkasan Sprint

Sprint 14 mengimplementasikan **Epic J P0** end-to-end: modul API `online_orders`, migrasi Prisma produksi, integrasi storefront ke API live, Midtrans Snap (mock/sandbox), pengurangan stok pada `PAID`, dan antrian fulfillment kasir.

| Prioritas | Deliverable | Owner |
|-----------|-------------|-------|
| **P0** | Prisma migration + `online_orders` NestJS module | Fajar |
| **P0** | Storefront `/store/[slug]` → API live (ganti mock) | Dimas |
| **P0** | Stok deduct `SALE_ONLINE` pada webhook `PAID` | Fajar + Eko |
| **P1** | Midtrans Snap + webhook idempotent | Fajar + Arif |
| **P1** | Halaman antrian fulfillment kasir US-J-07 | Dimas |

---

## Milestone

| # | Milestone | Gate | Target |
|---|-----------|------|--------|
| S14-M1 | Planning docs + test plan skeleton | Budi assign | W1 |
| S14-M2 | Prisma migration + ErrorCodes | Fajar review | W1 |
| S14-M3 | API storefront publik + fulfillment POS | RFC § Endpoints | W1–W2 |
| S14-M4 | Web konsumsi API + checkout flow | Maya wireframe approved | W2 |
| S14-M5 | UAT Epic J P0 | Citra test plan | W2 |

---

## Acceptance Criteria — P0

- [x] Migrasi `online_orders`, `online_order_items`, `online_order_payments`, `online_order_sequences` + kolom produk web
- [x] `GET/POST /api/v1/store/:tenantSlug/…` sesuai RFC
- [x] `GET/PATCH /api/v1/online-orders/…` fulfillment kasir (JWT + outlet scope)
- [x] Webhook `POST /api/v1/webhooks/midtrans/online` idempotent by `midtransTransactionId`
- [x] Stok berkurang pada transisi `PAID` dengan `stock_movements.type = SALE_ONLINE`
- [x] Storefront tidak lagi memakai `mock-api.ts` untuk katalog/checkout
- [x] `@barokah/api` test count ≥ 69 — **75/75**
- [x] `@barokah/web` typecheck + test lulus — **60/60**

---

## Defer (Non-blocking Sprint 14)

| Item | Target |
|------|--------|
| Delivery checkout US-J-05 | Sprint 15 |
| Socket.io notifikasi kasir US-J-08 | Sprint 15 |
| Owner UI kelola `sellOnline` / gambar | Sprint 15 |
| CAPTCHA guest checkout | P1 backlog |

---

## Handoff Log

| From | To | Task | Parallel OK? | Next action |
|------|-----|------|--------------|-------------|
| Budi · CEO | Fajar · Senior Dev | API + migration | Ya (backend lane) | Implement modul |
| Budi · CEO | Dimas · Senior Frontend | Wire storefront | Ya (frontend lane) | Ganti mock → API |
| Fajar · Senior Dev | Arif · Integration | Midtrans env + webhook | Tidak | Review signature |
| Fajar · Senior Dev | Citra · QA | Test plan skeleton | Ya | UAT setelah staging |
| Dimas · Senior Frontend | Citra · QA | Smoke storefront + kasir queue | Tidak | Setelah M3+M4 |

---

*Disusun: Hendra Pratama (Planner) · 5 Juni 2026 · Owner implementasi: Fajar + Dimas*
