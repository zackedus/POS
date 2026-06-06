> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Requirements | Audience: Pak Zaki, Budi, Hendra, Fajar, Dimas, Citra

# Sprint 15 Plan — Epic J Carry-over + Hardening

> **Periode:** 6 Juni 2026 (kickoff)  
> **Status:** **PLANNED**  
> **Orchestrator:** Budi Santoso (CEO)  
> **Carry-over:** [SPRINT-14-CLOSURE.md](../sprint/SPRINT-14-CLOSURE.md)  
> **RFC:** [ONLINE-ORDERS-RFC.md](../api/ONLINE-ORDERS-RFC.md) (APPROVED)  
> **User stories:** [EPIC-J-USER-STORIES.md](./EPIC-J-USER-STORIES.md) (US-J-05 … US-J-08)

---

## Ringkasan Sprint

Sprint 15 menutup **defer Sprint 14**: delivery checkout, Midtrans sandbox live, admin katalog web (`sellOnline` + gambar), notifikasi kasir real-time, rate limit storefront, dan polish offline PWA. Epic J P0 (pickup + fulfillment) sudah **CLOSED** — sprint ini fokus P1 hardening + omnichannel polish.

| Prioritas | Deliverable | Owner |
|-----------|-------------|-------|
| **P0** | US-J-05 Delivery checkout (API + storefront) | Fajar + Dimas |
| **P0** | Midtrans sandbox live + env docs | Arif → Fajar |
| **P1** | Owner UI `sellOnline` / gambar produk | Dimas + Maya |
| **P1** | Socket.io notifikasi kasir (US-J-08) | Fajar + Dimas |
| **P1** | Rate limit storefront publik | Fajar + Yoga |
| **P2** | Offline PWA polish (hold UX, banner, sync metrics) | Dimas + Fajar |
| **P2** | Payment expired auto-cancel (TTL 60 menit) | Fajar + Andi |

---

## Milestone

| # | Milestone | Gate | Target |
|---|-----------|------|--------|
| S15-M1 | Sprint plan + test plan skeleton | Budi assign | W1 |
| S15-M2 | Delivery API contract freeze + Maya wireframe delivery tab | Fajar + Maya | W1 |
| S15-M3 | Delivery checkout E2E + Midtrans sandbox smoke | Arif sign-off | W1–W2 |
| S15-M4 | Owner admin katalog web + Socket.io kasir | Maya approved UI | W2 |
| S15-M5 | Rate limit + offline PWA polish | Yoga infra review | W2 |
| S15-M6 | UAT Sprint 15 + regression Epic J + offline | Citra test plan | W2 |

---

## Acceptance Criteria — P0 / P1

### US-J-05 — Delivery checkout
- [ ] `POST /store/:slug/orders` menerima `fulfillmentType: DELIVERY` dengan alamat valid
- [ ] Error `ONLINE_DELIVERY_NOT_AVAILABLE` dihapus/diganti validasi bisnis delivery
- [ ] Storefront tab Delivery + form alamat (wireframe Maya)
- [ ] Biaya ongkir / radius — minimal flat fee atau placeholder sesuai RFC § delivery

### Midtrans sandbox live
- [ ] `MIDTRANS_SERVER_KEY` + `MIDTRANS_CLIENT_KEY` terdokumentasi di `.env.example`
- [ ] Snap redirect sandbox (bukan mock) — smoke manual Arif + Fajar
- [ ] Webhook sandbox idempotent tetap PASS regresi

### Owner UI — `sellOnline` / gambar
- [ ] Halaman admin: toggle `sellOnline`, upload/paste `imageUrl`, preview katalog web
- [ ] RBAC: Owner + Manager only (ADR-004 Q-J08)
- [ ] Perubahan tercermin di `GET /store/:slug/catalog/products`

### Socket.io — US-J-08
- [ ] Event `online-order:paid` / status change ke room outlet kasir
- [ ] Kasir `/pos/online-orders` auto-refresh atau toast tanpa full reload
- [ ] Fallback polling jika socket disconnect

### Rate limit storefront
- [ ] `POST /store/:slug/orders` — throttle per IP + per `tenantSlug` (RFC § rate limit)
- [ ] Response `429` + `RATE_LIMIT_EXCEEDED` sesuai [ERROR-HANDLING-VALIDATION.md](../standards/ERROR-HANDLING-VALIDATION.md)

### Offline PWA polish (P2)
- [ ] Banner offline/online state konsisten
- [ ] Hold queue drain UX + error surfacing
- [ ] Regresi SCR-S12 + SCR-O* PASS

---

## Defer (Non-blocking Sprint 15)

| Item | Target |
|------|--------|
| CAPTCHA guest checkout | Backlog P1 |
| Expo mobile offline | Fase 2 opsional |
| Multi-outlet storefront picker advanced | Sprint 16+ |

---

## Parallel Lane (post contract freeze)

| Lane | Lead | Implement | Gate |
|------|------|-----------|------|
| Backend delivery + rate limit + socket | **Fajar** | **Andi** (expiry job, rate limit middleware) | Fajar PR review |
| Frontend delivery + admin + kasir socket | **Dimas** | **Bima** (admin pages assigned) | Maya wireframe |
| Integration Midtrans | **Arif** | — | Smoke sign-off |
| QA | **Citra** | — | AC Dewi + staging |
| DevOps | **Yoga** | rate limit infra notes, dev script | LOCAL-DEV / DOCKER docs |

**Parallel OK?** Ya — setelah S15-M2 contract delivery + wireframe admin approved.

---

## Handoff Log

| From | To | Task | Parallel OK? | Next action |
|------|-----|------|--------------|-------------|
| Budi · CEO | Hendra · Planner | Finalisasi allocation Sprint 15 | — | ✅ Plan doc |
| Budi · CEO | Fajar · Senior Dev | Delivery API + socket + rate limit | Ya (backend) | Contract freeze M2 |
| Budi · CEO | Dimas · Senior Frontend | Delivery UI + admin sellOnline | Ya (frontend) | Tunggu Maya wireframe |
| Budi · CEO | Arif · Integration | Midtrans sandbox credential | Tidak | Handoff Fajar smoke |
| Budi · CEO | Maya · UI/UX | Wireframe delivery tab + admin katalog | Tidak | Block UI delivery |
| Budi · CEO | Citra · QA | Test plan skeleton → UAT | Ya | Setelah staging |
| Budi · CEO | Yoga · DevOps | Dev script timeout + docs cross-link | Ya | ✅ P0 dev-all fix |
| Fajar · Senior Dev | Andi · Backend Dev | Payment expiry job | Ya | Setelah delivery merge |

---

*Disusun: Hendra Pratama (Planner) · 6 Juni 2026 · Owner implementasi: Fajar + Dimas · QA gate: Citra*
