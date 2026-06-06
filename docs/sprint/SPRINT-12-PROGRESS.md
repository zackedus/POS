> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Sprint Progress | Audience: Pak Zaki, Budi, Hendra, Fajar, Dimas, Yoga, Citra

# Sprint 12 — Progress (Offline Hardening — Gabungan)

> **Tanggal update:** 2 Juni 2026  
> **Status sprint:** **CLOSED**  
> **Plan:** [SPRINT-12-PLAN.md](../requirements/SPRINT-12-PLAN.md) · **Closure:** [SPRINT-12-CLOSURE.md](./SPRINT-12-CLOSURE.md) · **UAT:** [SPRINT-12-UAT-FINAL.md](../testing/SPRINT-12-UAT-FINAL.md)  
> **Frontend detail:** [SPRINT-12-FRONTEND-PROGRESS.md](./SPRINT-12-FRONTEND-PROGRESS.md)

---

## Status Ringkas

| Jalur | Owner | Progress | Status |
|-------|-------|----------|--------|
| **Backend** — BullMQ, hold sync API, health Redis | **Fajar + Andi** | 100% | ✅ COMPLETE |
| **DevOps** — Redis compose + health | **Yoga** | 100% | ✅ COMPLETE |
| **Frontend** — konflik UI, hold PWA, katalog cache | **Dimas + Bima** | 100% | ✅ COMPLETE |
| **Discovery** — Epic J + Q-J01–Q-J08 | **Rina → Dewi** | 100% | ✅ COMPLETE (no code) |
| **QA** — SCR-S12-* + regresi | **Citra** | 100% | ✅ COMPLETE |

---

## Verifikasi Teknis (2 Juni 2026 — re-run penutupan)

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

## Deliverables Utama

| Area | Ringkasan | Status |
|------|-----------|--------|
| BullMQ + fallback | `sync-replay.dispatcher.ts`, worker Redis | ✅ |
| Hold/recall API | migration `20260602190000_sprint12_*` | ✅ |
| Konflik + hold PWA | `OfflineBanner`, `offline-hold-*`, `catalog-cache` | ✅ |
| Epic J discovery | [EPIC-J-ONLINE-STOREFRONT-DISCOVERY.md](../requirements/EPIC-J-ONLINE-STOREFRONT-DISCOVERY.md) | ✅ |
| UAT final | [SPRINT-12-UAT-FINAL.md](../testing/SPRINT-12-UAT-FINAL.md) PASS | ✅ |

---

## Defer → Sprint 13

| Item | Target |
|------|--------|
| Hold idempotency `clientRequestId` | Sprint 13 Track A |
| Epic J implementasi storefront | Sprint 13 Track B — blocked Q-J |
| Katalog delta API | Sprint 13+ |
| Void/refund offline | Defer |
