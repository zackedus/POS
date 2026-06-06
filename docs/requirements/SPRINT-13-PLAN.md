> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Requirements | Audience: Pak Zaki, Budi, Hendra, Fajar, Dimas, Rina, Dewi, Maya

# Sprint 13 Plan — Offline Polish + Epic J Storefront (Track B ACTIVE)

> **Periode:** 2 Juni 2026 (kickoff)  
> **Status:** **IN PROGRESS** — Track A READY · Track B **ACTIVE** (Opsi 1 Pak Zaki)  
> **Orchestrator:** Budi Santoso (CEO)  
> **Carry-over:** [SPRINT-12-CLOSURE.md](../sprint/SPRINT-12-CLOSURE.md)  
> **Keputusan Epic J:** [ADR-004](../decisions/ADR-004-EPIC-J-DEFAULTS-LOCKED.md) · Discovery: [EPIC-J-ONLINE-STOREFRONT-DISCOVERY.md](./EPIC-J-ONLINE-STOREFRONT-DISCOVERY.md) · User stories: [EPIC-J-USER-STORIES.md](./EPIC-J-USER-STORIES.md)

---

## Ringkasan Dua Jalur

| Track | Fokus | Status | Owner |
|-------|-------|--------|-------|
| **A — Offline polish** | BullMQ observability, hold idempotency API+PWA, katalog delta (opsional) | **READY** — dev paralel | Fajar + Andi · Dimas + Bima · Yoga |
| **B — Epic J storefront** | Planning + gate → skeleton → build bertahap | **ACTIVE** — Q-J terkunci [ADR-004](../decisions/ADR-004-EPIC-J-DEFAULTS-LOCKED.md) | Dewi → Maya → Fajar → Dimas |

> **Keputusan Pak Zaki (2 Jun 2026):** **Opsi 1 — Unlock Epic J (Track B)**. Semua Q-J01–Q-J08 mengikuti default tim — tanpa override. **Tidak ada kode produksi storefront** sebelum wireframe Maya approved + kontrak API Fajar.

---

## Track A — Carry-over Sprint 12 (Scope In)

| # | Deliverable | Owner | Prioritas |
|---|-------------|-------|-----------|
| A1 | Hold `clientRequestId` idempotent di API (`POST /transactions/hold` + sync replay) | Fajar | P0 |
| A2 | Wire idempotency hold di PWA (`offline-hold-sync.ts`) | Dimas | P0 |
| A3 | BullMQ polish — logging job failed, metric hook di health/status | Fajar + Yoga | P1 |
| A4 | Katalog: evaluasi `GET /catalog/snapshot` delta vs grid snapshot penuh | Dimas + Eko | P2 |
| A5 | Regression SCR-S12 + SCR-O* + SCR-V* | Citra | P0 gate |

## Track A — Scope Out

- Void/refund offline antrean.
- Expo mobile SQLite offline.
- Printer thermal fisik.
- Implementasi penuh storefront pelanggan (Track B gate).

---

## Track B — Epic J Online Storefront (ACTIVE)

### Milestone Sprint 13 (planning & gate — tanpa build penuh)

| # | Milestone | Owner | Gate / Deliverable | Target |
|---|-----------|-------|-------------------|--------|
| **B1** | Keputusan Q-J01–Q-J08 terdokumentasi | Pak Zaki + Budi | [ADR-004](../decisions/ADR-004-EPIC-J-DEFAULTS-LOCKED.md) | ✅ Done |
| **B2** | User story + AC P0 US-J-01 … US-J-07 | Dewi | [EPIC-J-USER-STORIES.md](./EPIC-J-USER-STORIES.md) | ✅ Done |
| **B3** | Wireframe storefront P0 (guest, katalog, keranjang, pickup checkout, bayar) | Maya | `docs/design/WIREFRAMES-STOREFRONT.md` (TBD) | Sprint 13 W2 |
| **B4** | Kontrak API storefront + Prisma RFC stub (`online_orders`) | Fajar | [ONLINE-ORDERS-RFC.md](../api/ONLINE-ORDERS-RFC.md) + [draft Prisma](../packages/database/prisma/draft/online-orders.rfc.prisma) | **DRAFT** — review Eko/Arif |
| **B5** | Skeleton app storefront Next.js (route group, layout, placeholder pages) | Dimas | `apps/web` `/store/[slug]/*` scaffold | Setelah B4 draft |

### Milestone Sprint 14+ (implementasi — out of scope Sprint 13 plan detail)

| # | Deliverable | Owner | Gate |
|---|-------------|-------|------|
| B6 | API `online_orders` + Midtrans web webhook | Fajar + Arif | B4 RFC approved |
| B7 | UI katalog + keranjang + checkout pickup | Dimas + Bima | B3 + B4 |
| B8 | Antrian fulfillment kasir (US-J-07) | Fajar + Dimas | B6 |
| B9 | Delivery checkout (US-J-05 P1) | Dimas + Fajar | Setelah pickup MVP UAT |

### Parallel Track A + B

| Pertanyaan | Jawaban |
|------------|---------|
| Workstream independen? | **Ya** — file boundary berbeda (offline vs `/store` routes) |
| Kontrak interface jelas? | **Sebagian** — US-J AC done; API/wireframe Sprint 13 |
| Pak Zaki konfirmasi parallel? | **Ya** — Opsi 1 |

---

## Pertanyaan Q-J — Status (CONFIRMED)

| ID | Jawaban terkunci | ADR |
|----|------------------|-----|
| Q-J01 | Pickup P0 · delivery P1 | [ADR-004](../decisions/ADR-004-EPIC-J-DEFAULTS-LOCKED.md) |
| Q-J02 | Guest checkout P0 | ADR-004 |
| Q-J03 | Midtrans P0 · bayar di toko P1 | ADR-004 |
| Q-J04 | URL per tenant + pilih outlet | ADR-004 |
| Q-J05 | Real-time + cache ≤ 60s | ADR-004 |
| Q-J06 | Placeholder/gambar wajib | ADR-004 |
| Q-J07 | Harga = kasir | ADR-004 |
| Q-J08 | Owner + Manager kelola katalog | ADR-004 |

Detail: [EPIC-J-ONLINE-STOREFRONT-DISCOVERY.md](./EPIC-J-ONLINE-STOREFRONT-DISCOVERY.md) § Pertanyaan Terbuka.

---

## Acceptance Criteria — Track A

- [ ] Hold offline tidak double-bill saat replay `clientRequestId` sama.
- [ ] `@barokah/api` lint, typecheck, test, build lulus.
- [ ] `@barokah/web` lint, typecheck, test, build lulus.
- [ ] UAT Sprint 13 PASS (test plan TBD — **Citra** setelah scope freeze **Hendra**).

## Acceptance Criteria — Track B (Sprint 13)

- [x] Q-J01–Q-J08 terdokumentasi ([ADR-004](../decisions/ADR-004-EPIC-J-DEFAULTS-LOCKED.md)).
- [x] [EPIC-J-USER-STORIES.md](./EPIC-J-USER-STORIES.md) US-J-01 … US-J-07 dengan AC.
- [ ] Wireframe Maya **approved** sebelum coding storefront produksi.
- [ ] RFC API Fajar **reviewed** oleh Fajar + Eko (stok) + Arif (Midtrans).
- [ ] Skeleton `/store` merged tanpa breaking kasir routes (Dimas).
- [ ] **Tidak** merge fitur pembayaran/checkout produksi sebelum B3+B4 gate.

---

## Handoff Log — Sprint 13

| From | To | Task | Deliverable | Parallel OK? | Next action |
|------|-----|------|-------------|--------------|-------------|
| Budi · CEO | Hendra · Planner | Finalisasi allocation S13 A+B | Board task per agent | Ya | SP estimate Track B |
| Budi · CEO | Dewi · Analyst | US-J AC P0 | EPIC-J-USER-STORIES.md | — | ✅ Done — notify Maya |
| Dewi · Analyst | Maya · UI/UX | Wireframe storefront P0 | WIREFRAMES-STOREFRONT.md | Tidak | Guest + pickup + Midtrans flow |
| Dewi · Analyst | Fajar · Senior Dev | Tunggu Maya | — | Tidak | Draft RFC setelah B3 |
| Maya · UI/UX | Fajar · Senior Dev | Handoff UX → API | Wireframe approved | Tidak | OpenAPI + Prisma stub |
| Fajar · Senior Dev | Dimas · Senior Frontend | Kontrak API | ONLINE-ORDERS-RFC.md | Tidak | Skeleton `/store` |
| Fajar · Senior Dev | Andi · Backend Dev | Track A hold idempotency | API module | Ya | Implement A1 |
| Dimas · Senior Frontend | Bima · Frontend Dev | Track A PWA + skeleton store | PR terpisah | Ya | Bima halaman assigned post-wireframe |
| Hendra · Planner | Citra · QA | Test plan S13 | SPRINT-13-TEST-PLAN.md | Ya | AC Track A + gate Track B |
| Budi · CEO | Fitri · Docs | Indeks ADR-004 + Epic J | INDEX.md/json | Ya | Cross-link |

---

## Handoff dari Sprint 12

| From | To | Task |
|------|-----|------|
| Budi | Hendra | Finalisasi allocation Sprint 13 (Track A + B parallel) |
| Fajar | Andi | Hold idempotency API |
| Fajar | Dimas | Kontrak `clientRequestId` hold |
| Pak Zaki | Budi | **Opsi 1** — unlock Track B ✅ |
| Dewi | Maya | Wireframe dari [EPIC-J-USER-STORIES.md](./EPIC-J-USER-STORIES.md) |

---

## Referensi

- [SPRINT-12-CLOSURE.md](../sprint/SPRINT-12-CLOSURE.md)
- [SPRINT-12-UAT-FINAL.md](../testing/SPRINT-12-UAT-FINAL.md)
- [FEATURE-BACKLOG.md](./FEATURE-BACKLOG.md) — Epic J
- [ADR-003](../decisions/ADR-003-SCOPE-RETAIL-ONLINE-OFFLINE.md)
- [ADR-004](../decisions/ADR-004-EPIC-J-DEFAULTS-LOCKED.md)

---

*Diperbarui: 2 Juni 2026 — Track B ACTIVE (Opsi 1 Pak Zaki)*
