> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Requirements | Audience: Hendra, Fajar, Yoga

# Sprint 1 Plan — Foundation

> **Sprint Master:** Hendra Pratama  
> **Periode:** 2–15 Juni 2026 (2 minggu)  
> **Referensi:** [2026-06-01-KICKOFF-MEETING.md](../meetings/2026-06-01-KICKOFF-MEETING.md), [FEATURE-BACKLOG.md](./FEATURE-BACKLOG.md), [VISION-ZAKI-MATURED.md](./VISION-ZAKI-MATURED.md)

> **Update 1 Jun 2026 (Rapat Visi Pak Zaki):** Scope Sprint 1 **tidak berubah**. Visi lengkap Pak Zaki (10 modul) di-fase ke Fase 2–3; north star: [VISION-ZAKI-MATURED.md](./VISION-ZAKI-MATURED.md). Fajar menambah deliverable Sprint 1 akhir: **Schema Extension RFC** (variants/sku_units) draft untuk perencanaan Sprint 2 — bukan implementasi di Sprint 1.
>
> **Footnote konfirmasi Pak Zaki (Q1–Q6, 1 Jun 2026):** Keenam pertanyaan terbuka visi **CONFIRMED** — vertical **retail bahan bangunan**, hold TTL **30 menit**, **web kasir MVP** (Expo Fase 2), **satu paket SaaS**, **NestJS+Prisma**, **varian sebelum bundling** (Sprint 5 area). **Tidak ada perubahan scope Sprint 1.** Detail: [ADR-002-PAK-ZAKI-CONFIRMATIONS.md](../decisions/ADR-002-PAK-ZAKI-CONFIRMATIONS.md).

---

## Sprint Goal

> **"Tim development punya fondasi siap pakai: dev environment jalan, schema DB MVP ter-migrate, auth + login end-to-end, dan spec pendukung (PPN, integrasi) draft ready untuk Sprint 2."**

**Bukan goal Sprint 1:** transaksi kasir, master data CRUD, QRIS, printer — semua Sprint 2+.

---

## Scope Sprint 1

### In Scope ✅

| ID | Task | Assignee | SP |
|----|------|----------|-----|
| S1-01 | Docker Compose: PostgreSQL 16, Redis 7, API dev, Web dev | Yoga | 5 | ⏳ blocked Docker |
| S1-02 | `.env.example` + dev setup README | Yoga | 2 | ✅ `.env` + progress doc |
| S1-03 | GitHub Actions CI: lint, test, build monorepo | Yoga | 3 |
| S1-04 | Prisma schema MVP — 22 tabel initial migration | Fajar | 8 | ✅ SQL init; apply pending DB |
| S1-05 | Seed script: 1 tenant, 1 outlet, 3 users (owner/manager/kasir) | Fajar | 3 | ✅ |
| S1-06 | Auth module: register internal, login, refresh, logout | Fajar | 8 | ✅ login+refresh (logout deferred) |
| S1-07 | RBAC guard: Owner, Manager, Cashier enum | Fajar | 3 | ✅ |
| S1-08 | Login page Next.js (SCR-L01) — email/password form | Dimas | 5 | ✅ |
| S1-09 | Auth API integration web (token storage, redirect) | Dimas | 3 | ✅ localStorage + refresh 401 |
| S1-10 | Health check endpoint `/api/v1/health` | Fajar | 1 | ✅ DB check included |
| S1-10b | Exception filter + API error envelope (standar validasi) | Fajar | 3 | ✅ |
| S1-11 | User story Epic A + acceptance criteria final | Dewi | 3 |
| S1-12 | PPN 11% algorithm spec draft | Eko | 3 |
| S1-13 | Integration readiness doc (QRIS + printer overview) | Arif | 2 |
| S1-14 | Glosarium merchant (PKP, PPN, shift recon) | Fitri | 2 |
| S1-15 | Wireframe review login + buka shift — approval note | Maya | 2 |
| S1-16 | Sprint 2 backlog refinement prep | Hendra | 2 |
| S1-17 | Schema Extension RFC (variants, sku_units) — draft only | Fajar | 2 |

**Total estimasi:** ~57 SP → **commit 40 SP** (prioritas P0 cut: S1-16 buffer, S1-17 jika overload, S1-10 jika overload)

> S1-17 dari rapat visi Pak Zaki — **RFC dokumen saja**, bukan migration Sprint 1.

### Out of Scope ❌

- CRUD produk / kategori
- Buka shift API & UI
- Layar kasir main (SCR-K01)
- Transaksi / checkout
- QRIS / printer implementasi
- Mobile Expo app
- Staging deploy (target Sprint 2 akhir)

---

## Tasks per Agent

### Yoga Permana · DevOps

| Task | Deliverable | Due |
|------|-------------|-----|
| Docker Compose dev stack | `docker/docker-compose.yml` | 3 Jun |
| Env template | `.env.example` | 3 Jun |
| CI pipeline | `.github/workflows/ci.yml` | 10 Jun |
| Dev setup doc | `docs/dev/SETUP.md` | 5 Jun |

**Handoff:** Yoga → Fajar (Docker ready) sebelum S1-04 migration.

---

### Fajar Ramadhan · Senior Developer (Backend/API)

| Task | Deliverable | Due |
|------|-------------|-----|
| Prisma migration MVP | `packages/database/prisma/` | 5 Jun |
| Seed data | `packages/database/prisma/seed.ts` | 6 Jun |
| Auth module NestJS | `apps/api/src/auth/` | 10 Jun |
| RBAC guards | `apps/api/src/common/guards/` | 11 Jun |
| Auth API contract doc (freeze for Dimas) | `docs/api/AUTH.md` draft | 10 Jun |
| Health endpoint | `apps/api/src/health/` | 8 Jun |
| Exception filter + error envelope | `apps/api/src/common/filters/` | 11 Jun |

**Handoff:** Fajar → Dimas (auth API contract freeze, 10 Jun) sebelum S1-08/S1-09.

---

### Dimas Pratama · Senior Frontend Developer

| Task | Deliverable | Due |
|------|-------------|-----|
| Login page SCR-L01 | `apps/web/src/app/login/` | 12 Jun |
| Auth client integration (token, redirect) | `apps/web/src/lib/api/auth.ts` (atau setara) | 12 Jun |
| Error UI SCR-L02 inline | Login form error states | 12 Jun |

**Dependencies:** Blocked S1-08 until Maya SCR-L01 approval (3 Jun) + Fajar auth contract (10 Jun).  
**Handoff:** Dimas → Maya (UX review login, 13 Jun).

> **Standar validasi/error P0:** lihat [ERROR-HANDLING-VALIDATION.md](../standards/ERROR-HANDLING-VALIDATION.md). ValidationPipe global sudah ada di `main.ts` — S1-10b menambah exception filter + `ErrorCodes` dari `@barokah/shared`.

**Dependencies:** Blocked S1-04 until Yoga Docker (3 Jun).  
**Handoff:** Fajar → Fitri (auth API contract freeze, 11 Jun).

---

### Dewi Kartika · Business Analyst

| Task | Deliverable | Due |
|------|-------------|-----|
| User stories Epic A (Auth) | `docs/requirements/user-stories/EPIC-A-AUTH.md` | 4 Jun |
| AC review login flow vs SCR-L01 | Comment on USER-FLOWS.md | 5 Jun |
| Epic B story stubs (Sprint 2 prep) | Draft in FEATURE-BACKLOG.md | 14 Jun |

**Handoff:** Dewi → Hendra (AC sign-off Sprint 1, 5 Jun).

---

### Hendra Pratama · Project Planner

| Task | Deliverable | Due |
|------|-------------|-----|
| Publish Sprint 1 plan | This document | 2 Jun |
| Daily standup cadence setup | Slack/async checklist | 2 Jun |
| Sprint 2 plan draft | `docs/requirements/SPRINT-2-PLAN.md` (stub) | 14 Jun |
| Velocity tracking sheet | `docs/team/SPRINT-BOARD.md` (stub) | 3 Jun |

---

### Maya Anggraini · UI/UX

| Task | Deliverable | Due |
|------|-------------|-----|
| Approve SCR-L01 login wireframe | Sign-off note in WIREFRAMES-KASIR.md | 3 Jun |
| SCR-S01 buka shift — final review | WIREFRAMES-KASIR.md | 5 Jun |
| Design tokens checklist for login | Reference DESIGN-SYSTEM.md | 4 Jun |
| Kasir main wireframe — **draft only** (handoff Sprint 2) | WIREFRAMES-KASIR.md WIP | 14 Jun |

**Gate:** Dimas **tidak** coding SCR-K01 sebelum Maya handoff Sprint 2 akhir.

---

### Eko Susilo · Algorithm

| Task | Deliverable | Due |
|------|-------------|-----|
| PPN 11% spec draft | `docs/algorithms/PPN-SPEC.md` | 10 Jun |
| Rounding rules unit test cases (table) | Appendix in PPN-SPEC.md | 10 Jun |
| Confirm: no diskon MVP | Comment in FEATURE-BACKLOG.md | 2 Jun |

**Handoff:** Eko → Fajar (spec review before Sprint 3).

---

### Arif Hidayat · Integration

| Task | Deliverable | Due |
|------|-------------|-----|
| Integration readiness overview | `docs/integration/README.md` | 8 Jun |
| Midtrans sandbox account setup guide | Section in integration README | 8 Jun |
| Printer ESC/POS compatibility notes | Section in integration README | 8 Jun |
| Webhook idempotency pattern draft | Section in integration README | 10 Jun |

**Note:** POC Midtrans dimulai Sprint 2 — bukan Sprint 1.

---

### Fitri Nugroho · Documentation

| Task | Deliverable | Due |
|------|-------------|-----|
| Meeting minutes final | `docs/meetings/2026-06-01-KICKOFF-MEETING.md` | 2 Jun |
| Glosarium merchant | `docs/user/GLosarium-MERCHANT.md` | 8 Jun |
| API auth docs (post Fajar freeze) | `docs/api/AUTH.md` | 12 Jun |
| Panduan kasir template | `docs/user/PANDUAN-KASIR.md` (skeleton) | 14 Jun |

---

### Rina Wulandari · POS Domain

| Task | Deliverable | Due |
|------|-------------|-----|
| Validate financial pulse scope Sprint 4 | Sign-off in kickoff meeting | 2 Jun ✅ |
| Review shift recon AC (Epic B prep) | Comment for Dewi | 12 Jun |
| Merchant onboarding tax FAQ outline | Input for Fitri glosarium | 8 Jun |

---

### Budi Santoso · CEO

| Task | Deliverable | Due |
|------|-------------|-----|
| Approve Sprint 1 scope | Decision D-08 | 2 Jun ✅ |
| Sprint 1 review / demo login | Go/no-go Sprint 2 | 15 Jun |
| Unblock parallel decisions | Handoff log sign-off | 2 Jun ✅ |

---

## Definition of Done (Sprint 1)

Sprint 1 dianggap **selesai** jika semua kriteria berikut terpenuhi:

### Infrastructure
- [ ] `docker compose up` menjalankan PostgreSQL + Redis + API + Web tanpa error *(blocked Docker Desktop 1 Jun — lihat [SPRINT-1-PROGRESS.md](../sprint/SPRINT-1-PROGRESS.md))*
- [ ] CI pipeline green pada branch `main`
- [x] `.env.example` documented di README/dev setup *(`.env` + progress doc)*

### Backend
- [x] Prisma migration MVP applied clean pada fresh DB *(applied via PostgreSQL lokal; verifikasi di progress sprint)*
- [x] Seed script: 1 tenant, 1 outlet, 3 users dengan role berbeda *(jalankan `npm run db:seed` post-migrate)*
- [x] `POST /api/v1/auth/login` return access + refresh token *(kode merged)*
- [x] `POST /api/v1/auth/refresh` rotate token *(kode merged)*
- [x] RBAC guard block kasir dari endpoint owner-only (test) *(smoke test: `INSUFFICIENT_PERMISSION`)*
- [x] `GET /api/v1/health` return 200 + DB connectivity check
- [x] API error response envelope compliant (`success: false`, `error.code` dari `ErrorCodes`)
- [x] ValidationPipe rejects invalid input dengan 422 + field details

### Frontend
- [x] Login page render (`/login`) — SCR-L01 wireframe gate Maya 3 Jun
- [x] Login sukses → redirect `/pos` (placeholder OK)
- [x] Login gagal → inline error SCR-L02
- [x] Token persisted; refresh on 401 *(localStorage + retry once implemented)*

### Spec & Docs
- [ ] PPN-SPEC.md draft reviewed Fajar
- [ ] Integration README draft
- [ ] Glosarium merchant published
- [ ] Epic A user stories + AC complete

### Process
- [x] Sprint review demo: login end-to-end di dev environment *(demo teknis local sudah tervalidasi)*
- [ ] Retrospective notes documented
- [x] Sprint 2 plan draft ready

---

## Parallel Work — Justifikasi Checklist

| Workstream | Parallel dengan | Q1 Independen? | Q2 Kontrak jelas? | Q3 Budi/Hendra OK? | Verdict |
|------------|-----------------|----------------|-------------------|---------------------|---------|
| Yoga infra + Fajar schema | Sprint 1 hari 1–3 sequential, then parallel specs | Ya (post-Docker) | Ya (schema.prisma) | Ya | ✅ Parallel hari 4+ |
| Eko PPN spec + Fajar auth | Independent layers | Ya | Ya (spec doc) | Ya | ✅ Parallel |
| Arif integration doc + Fajar auth | Independent | Ya | Ya (README draft) | Ya | ✅ Parallel |
| Fitri glosarium + Yoga CI | Independent | Ya | N/A | Ya | ✅ Parallel |
| Maya wireframe + Dimas login UI | Maya must approve before Dimas codes SCR-L01 | Tidak for K01 | Ya for L01 | Ya | ⚠️ Sequential gate UI |
| Dimas login UI + Dewi AC | AC must exist before dev | Tidak | Ya after 4 Jun | Ya | ⚠️ Dewi first 4 Jun |
| Fajar auth API + Dimas client | Contract freeze before client | Tidak | Ya after 10 Jun | Ya | ⚠️ Fajar API first |

**Keputusan Budi:** Parallel diizinkan untuk infra/spec/docs. Dimas login UI start 10 Jun setelah Maya SCR-L01 approval (3 Jun) + Dewi AC (4 Jun) + Fajar auth contract freeze (10 Jun).

---

## Ceremonies

| Ceremony | Waktu | Peserta |
|----------|-------|---------|
| Sprint Planning | 2 Jun (done — kickoff) | All |
| Daily Standup (async) | Setiap hari kerja | All |
| Mid-sprint check | 9 Jun | Budi, Hendra, Fajar, Dimas, Yoga |
| Sprint Review | 15 Jun | All + Pak Zaki |
| Retrospective | 15 Jun | All |

---

## Risiko Sprint 1

| Risiko | Mitigasi |
|--------|----------|
| Docker Windows path issues | Yoga test on Pak Zaki machine day 1 |
| Schema churn | Freeze schema 6 Jun; changes → formal CR |
| Fajar backend overload | Dimas owns UI; defer S1-10 health to buffer |
| Over-scope Sprint 1 | Hendra gate: no master data CRUD |

---

## Handoff ke Sprint 2

| From | To | Deliverable | Next action |
|------|-----|-------------|-------------|
| Fajar | Fajar | Auth + schema merged | Start Catalog module API |
| Fajar | Dimas | Auth API contract | Wire login + refresh client |
| Maya | Dimas | SCR-K01 wireframe final | Implement kasir layout |
| Dewi | Dewi | Epic B user stories | AC master data + shift |
| Yoga | Fajar | Staging env (optional early) | Deploy Sprint 2 demo |
| Eko | Fajar | PPN-SPEC.md approved | Wire tax calc Sprint 3 |

---

*Disusun Hendra Pratama · Disetujui Budi Santoso · 1 Juni 2026 · Amended post rapat visi Pak Zaki (scope Sprint 1 unchanged, +S1-17 optional RFC)*
