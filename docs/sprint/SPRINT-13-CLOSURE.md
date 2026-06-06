> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Sprint Closure | Audience: Pak Zaki, Budi, Fitri, Hendra

# Sprint 13 — Closure (Offline Polish + Epic J Storefront Scaffold)

> **Tanggal closure:** 5 Juni 2026  
> **Orchestrator:** Budi Santoso (CEO)  
> **Status:** **CLOSED** (Track A backend · Track A PWA · Track B scaffold · QA)  
> **Referensi:** [SPRINT-13-PLAN.md](../requirements/SPRINT-13-PLAN.md), [SPRINT-13-PROGRESS.md](./SPRINT-13-PROGRESS.md), [SPRINT-13-UAT-FINAL.md](../testing/SPRINT-13-UAT-FINAL.md), [SPRINT-12-CLOSURE.md](./SPRINT-12-CLOSURE.md)

---

## Status Sprint

- **Status akhir:** **CLOSED** — tidak ada blocker P0 pada semua lane aktif
- **Fokus Track A:** Hold `clientRequestId` idempotent (API + PWA), BullMQ metrics di `GET /sync/status`
- **Fokus Track B:** RFC `online_orders` APPROVED + scaffold storefront guest UI (mock data)
- **Lanes:** Fajar+Andi (API) · Dimas+Bima (PWA + storefront) · Citra (QA) · Fitri (docs)

---

## Status Akhir per Area

| Area | Hasil |
|------|-------|
| Hold idempotency API (`clientRequestId` + migrasi) | ✅ |
| Hold idempotency PWA (`offline-hold-sync.ts`) | ✅ |
| BullMQ metrics + failed job logging | ✅ |
| Regresi Sprint 12 (SCR-O*, SCR-S12-*, SCR-V*) | ✅ |
| RFC `ONLINE-ORDERS-RFC.md` APPROVED | ✅ |
| Storefront scaffold `/store/[slug]` (mock) | ✅ |
| Test API | ✅ **69/69** |
| Test web | ✅ **59/59** |
| UAT final | ✅ **PASS** |
| Docs PLAN / PROGRESS / CLOSURE / UAT | ✅ |

---

## Verifikasi Teknis (5 Juni 2026 — re-run resmi penutupan)

### `@barokah/api`

| Perintah | Hasil |
|----------|-------|
| `npm run lint -w @barokah/api` | ✅ |
| `npm run typecheck -w @barokah/api` | ✅ |
| `npm run test -w @barokah/api` | ✅ **69/69** |
| `npm run build -w @barokah/api` | ✅ |

### `@barokah/web`

| Perintah | Hasil |
|----------|-------|
| `npm run lint -w @barokah/web` | ✅ |
| `npm run typecheck -w @barokah/web` | ✅ |
| `npm run test -w @barokah/web -- --run` | ✅ **59/59** |

**Perbaikan minor UAT:** `dashboard/page.test.tsx` — flake tanggal hardcoded (non-P0).

---

## Perubahan Utama vs Sprint 12

| Komponen | Sprint 12 | Sprint 13 |
|----------|-----------|-----------|
| Hold idempotency | Spike HOLD_BILL tanpa `clientRequestId` di hold API | Kolom DB + replay `POST /hold` + PWA sync |
| BullMQ observability | Label processor saja | + field `bullmq` counts di status |
| Epic J | Discovery + Q-J terkunci | RFC APPROVED + scaffold storefront mock |
| Test API | 68/68 | **69/69** (+1 hold idempotency) |
| Test web | 57/57 | **59/59** (+2 store pricing) |

---

## Defer — Non-blocking

| Item | Target |
|------|--------|
| Modul API `online_orders` + migrasi Prisma | **Sprint 14** |
| Webhook Midtrans + Snap live | Sprint 14 |
| Antrian fulfillment kasir US-J-07 | Sprint 14 |
| Delivery checkout US-J-05 (P1) | Sprint 14+ |
| Katalog delta `GET /catalog/snapshot` | Sprint 14 evaluasi |
| BullMQ Grafana dashboard | Infra Yoga — opsional |
| Void/refund offline | Defer |

---

## Handoff — Prioritas Sprint 14

| # | Prioritas | Owner | Catatan |
|---|-----------|-------|---------|
| 1 | Modul `online_orders` NestJS + Prisma | **Fajar** + **Andi** | Implementasi dari RFC approved |
| 2 | Wire storefront ke API live | **Dimas** + **Bima** | Ganti mock-api setelah contract freeze |
| 3 | Midtrans Snap + webhook online | **Arif** → **Fajar** | Integration spec |
| 4 | Antrian fulfillment kasir US-J-07 | **Dimas** + **Maya** | Wireframe + API consumer |
| 5 | UAT regression Sprint 14 gate | **Citra** | AC dari Dewi |

**Rencana:** [SPRINT-14-PLAN.md](../requirements/SPRINT-14-PLAN.md) *(Hendra assign post-closure)*

---

## Handoff Log

| From | To | Task | Parallel OK? |
|------|-----|------|--------------|
| Budi | Hendra | Finalisasi Sprint 14 allocation | Tidak — setelah closure |
| Fajar | Andi | Modul `online_orders` API | Ya — setelah Prisma migrasi freeze |
| Fajar | Dimas | Kontrak API live untuk storefront | Tidak — tunggu migrasi |
| Citra | Tim | Regression Sprint 14 gate | Ya — setelah staging |
| Fitri | — | INDEX + UAT final Sprint 13 | ✅ |

---

## Keputusan

**Sprint 13 dinyatakan CLOSED (gabungan Track A + Track B scaffold).** Offline PWA diperkuat dengan hold idempotency end-to-end dan observability BullMQ. Epic J memasuki fase implementasi dengan RFC approved dan guest storefront scaffold siap UAT mock — integrasi API live dimulai Sprint 14.

**Sprint berikutnya:** modul `online_orders` + wire storefront ke API produksi.
