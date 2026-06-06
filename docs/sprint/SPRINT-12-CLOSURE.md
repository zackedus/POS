> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Sprint Closure | Audience: Pak Zaki, Budi, Fitri, Hendra

# Sprint 12 — Closure (Offline Hardening + Epic J Discovery — Gabungan)

> **Tanggal closure:** 2 Juni 2026  
> **Orchestrator:** Budi Santoso (CEO)  
> **Status:** **CLOSED** (algorithm scope N/A · backend · frontend · DevOps · QA · discovery)  
> **Referensi:** [SPRINT-12-PLAN.md](../requirements/SPRINT-12-PLAN.md), [SPRINT-12-PROGRESS.md](./SPRINT-12-PROGRESS.md), [SPRINT-12-UAT-FINAL.md](../testing/SPRINT-12-UAT-FINAL.md), [SPRINT-11-CLOSURE.md](./SPRINT-11-CLOSURE.md)

---

## Status Sprint

- **Status akhir:** **CLOSED** — tidak ada blocker P0 pada semua lane aktif
- **Fokus Track A:** BullMQ replay, Redis health, hold/recall sync, konflik UI, katalog cache offline
- **Fokus Track B:** Discovery Epic J + pertanyaan Q-J01–Q-J08 (tanpa kode produksi)
- **Lanes:** Fajar+Andi (API) · Yoga (Redis) · Dimas+Bima (PWA) · Rina→Dewi (discovery) · Citra (QA)

---

## Status Akhir per Area

| Area | Hasil |
|------|-------|
| BullMQ worker `barokah-sync-replay` | ✅ |
| Retry/backoff + inline fallback | ✅ |
| Redis health `GET /health` | ✅ |
| `HOLD_BILL` / `RECALL_HOLD` sync spike | ✅ |
| UI konflik + hold IndexedDB + katalog cache | ✅ |
| Epic J discovery + Q-J terdokumentasi | ✅ |
| Test API | ✅ **68/68** |
| Test web | ✅ **57/57** |
| UAT final | ✅ **PASS** |
| Docs PLAN / PROGRESS / CLOSURE / UAT | ✅ |

---

## Verifikasi Teknis (2 Juni 2026 — re-run resmi penutupan)

### `@barokah/api`

| Perintah | Hasil |
|----------|-------|
| `npm run lint -w @barokah/api` | ✅ |
| `npm run typecheck -w @barokah/api` | ✅ |
| `npm run test -w @barokah/api` | ✅ **68/68** |
| `npm run build -w @barokah/api` | ✅ |

### `@barokah/web`

| Perintah | Hasil |
|----------|-------|
| `npm run lint -w @barokah/web` | ✅ |
| `npm run typecheck -w @barokah/web` | ✅ |
| `npm run test -w @barokah/web` | ✅ **57/57** |
| `npm run build -w @barokah/web` | ✅ |

---

## Perubahan Utama vs Sprint 11

| Komponen | Sprint 11 | Sprint 12 |
|----------|-----------|-----------|
| Replay processor | `in-process-stub` | BullMQ + `inline-fallback` |
| Health | DB saja | DB + Redis |
| Operasi sync | Checkout tunai/split | + hold/recall |
| UI kasir | Banner offline saja | + konflik resolve, hold queue, katalog cache |
| Epic J | Defer | Discovery + Q-J |

---

## Defer — Non-blocking

| Item | Target |
|------|--------|
| Hold idempotency `clientRequestId` | **Sprint 13 Track A** |
| BullMQ observability dashboard | Sprint 13+ |
| Katalog `GET /catalog/snapshot` delta | Sprint 13+ |
| Epic J implementasi storefront | **Sprint 13 Track B** — blocked **Q-J01–Q-J08** |
| Void/refund offline | Defer |

---

## Handoff — Prioritas Sprint 13

| # | Prioritas | Owner | Catatan |
|---|-----------|-------|---------|
| 1 | Hold idempotency API + PWA | **Fajar** + **Dimas** | Track A — **READY** |
| 2 | BullMQ polish (failed job logging) | **Fajar** + **Yoga** | Track A P1 |
| 3 | Jawaban Q-J01–Q-J08 dari Pak Zaki | **Pak Zaki** + **Budi** | Unlock Track B |
| 4 | User story + wireframe storefront | **Dewi** → **Maya** | Setelah Q-J |
| 5 | Implementasi storefront | **Fajar** + **Dimas** | Setelah wireframe + kontrak API |

**Rencana skeleton:** [SPRINT-13-PLAN.md](../requirements/SPRINT-13-PLAN.md)

---

## Handoff Log

| From | To | Task | Parallel OK? |
|------|-----|------|--------------|
| Budi | Hendra | Finalisasi Sprint 13 allocation | Tidak — setelah closure |
| Budi | Pak Zaki | Konfirmasi Q-J01–Q-J08 (workshop ~30 menit) | — |
| Fajar | Andi | Hold idempotency API | Ya |
| Fajar | Dimas | Kontrak + wire PWA hold idempotency | Ya |
| Citra | Tim | Regression Sprint 13 gate | Ya — setelah staging |
| Fitri | — | INDEX + UAT final Sprint 12 | ✅ |

---

## Keputusan

**Sprint 12 dinyatakan CLOSED (gabungan).** Offline PWA toko fisik diperkuat dengan worker BullMQ production-ready, spike hold/recall end-to-end, UI konflik, dan katalog cache MVP. Discovery Epic J selesai dengan pertanyaan terbuka untuk Pak Zaki — **implementasi online storefront dimulai Sprint 13 Track B hanya setelah Q-J dijawab.**

**Sprint berikutnya:** [SPRINT-13-PLAN.md](../requirements/SPRINT-13-PLAN.md)
