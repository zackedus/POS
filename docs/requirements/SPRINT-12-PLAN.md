> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Requirements | Audience: Pak Zaki, Budi, Hendra, Fajar, Dimas, Yoga, Rina, Dewi

# Sprint 12 Plan — Offline Hardening + Epic J Discovery (Gabungan)

> **Periode:** 2 Juni 2026  
> **Status:** **CLOSED** (gabungan backend + frontend + QA) → [SPRINT-12-CLOSURE.md](../sprint/SPRINT-12-CLOSURE.md)  
> **Owner backend:** Fajar Ramadhan + Andi Kurniawan  
> **Owner frontend:** Dimas Pratama + Bima Saputra  
> **Owner DevOps:** Yoga Permana · **QA:** Citra Lestari  
> **Carry-over:** [SPRINT-11-CLOSURE.md](../sprint/SPRINT-11-CLOSURE.md)

---

## Tujuan Sprint 12 (Gabungan)

### Track A — Offline hardening (implementasi)

1. **BullMQ worker** — ganti in-process replay stub; retry/backoff; inline fallback.
2. **Redis health** — monitoring di `GET /health`.
3. **Hold bill offline** — API `HOLD_BILL` / `RECALL_HOLD` + PWA IndexedDB.
4. **UI konflik** — banner/modal `GET /sync/conflicts`.
5. **Katalog cache MVP** — grid produk read-only offline.
6. **Verifikasi** — API **68/68**, web **57/57**, build lulus.

### Track B — Epic J discovery (no code)

7. **Discovery storefront online** — checklist Rina → user story stubs Dewi → [EPIC-J-ONLINE-STOREFRONT-DISCOVERY.md](./EPIC-J-ONLINE-STOREFRONT-DISCOVERY.md) + pertanyaan **Q-J01–Q-J08**.

---

## Scope In

| # | Deliverable | Owner | Track |
|---|-------------|-------|-------|
| 1 | BullMQ dispatcher + worker `barokah-sync-replay` | Fajar | A |
| 2 | Redis module + health | Fajar + Yoga | A |
| 3 | `HOLD_BILL`, `RECALL_HOLD` migration + processor | Fajar | A |
| 4 | Test SCR-S12-01 … 07 + regresi SCR-O* | Andi / Citra | A |
| 5 | Banner konflik + resolve UI | Dimas + Bima | A |
| 6 | Hold IndexedDB + sync | Dimas | A |
| 7 | Katalog cache snapshot | Dimas + Eko | A |
| 8 | Epic J discovery doc + Q-J | Rina → Dewi | B |
| 9 | UAT final PASS | Citra | A+B |

## Scope Out

- Void/refund offline antrean.
- Implementasi storefront Epic J (tunggu Q-J + wireframe Maya).
- Printer thermal fisik.

---

## Acceptance Criteria

- [x] `POST /sync/queue` processor `bullmq` saat Redis up; `inline-fallback` jika down/disabled.
- [x] `GET /health` → `services.redis`.
- [x] `HOLD_BILL` / `RECALL_HOLD` enqueue + replay idempotent (spike).
- [x] UI konflik + hold offline + katalog cache di `/pos`.
- [x] `@barokah/api` lint, typecheck, test **68/68**, build ✅.
- [x] `@barokah/web` lint, typecheck, test **57/57**, build ✅.
- [x] Epic J discovery + Q-J terdokumentasi (implementasi defer Sprint 13).
- [x] UAT final PASS — [SPRINT-12-UAT-FINAL.md](../testing/SPRINT-12-UAT-FINAL.md).

---

## Handoff → Sprint 13

| From | To | Task |
|------|-----|------|
| Budi | Hendra | Sprint 13 plan — Track A polish + Track B gate Q-J |
| Budi | Pak Zaki | Jawab Q-J01–Q-J08 untuk unlock Epic J build |
| Fajar | Andi | Hold idempotency `clientRequestId` |
| Fajar | Dimas | Wire idempotency hold PWA |

Detail: [SPRINT-13-PLAN.md](./SPRINT-13-PLAN.md) · [SPRINT-12-CLOSURE.md](../sprint/SPRINT-12-CLOSURE.md)
