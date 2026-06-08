# Indeks Dokumentasi — Barokah Core POS

> 📚 **Indeks master** · Maintainer: **Fitri Nugroho** · Terakhir diperbarui: **9 Juni 2026** (Finance AR/AP unified hub · Pilot go-live · v1.0.0)

---

## Pengumuman Tim — Sistem Indeks Dokumentasi

---
**Fitri** · Documentation Specialist

Halo tim Barokah Core,

Mulai 1 Juni 2026, semua dokumentasi proyek terpusat di folder `docs/` dan **terindeks di file ini**. Cara pakainya:

1. **Cari cepat per role** — gunakan tabel [Navigasi Cepat per Role](#navigasi-cepat-per-role) di bawah.
2. **Telusuri kategori** — [Katalog Lengkap](#katalog-lengkap) mengelompokkan dokumen by topik + tag.
3. **Header di setiap dokumen** — baris `📚 Indeks Dokumentasi` di atas setiap file mengarah balik ke sini.
4. **Onboarding anggota baru** — ikuti [Alur Baca Recommended](#alur-baca-recommended-onboarding).
5. **Butuh instruksi agent?** — baca skill di `.cursor/skills/` (bukan duplikat isi docs).

Kalau menambah dokumen baru: update **INDEX.md** + **INDEX.json** + tambahkan header cross-link. Tag harus konsisten (#mvp, #database, dll).

Halo Pak Zaki, indeks ini supaya tim tidak bingung dan bisa saling bantu cari referensi dengan cepat.

---

## Navigasi Cepat per Role

| Role | Agent | Dokumen yang Sering Dibutuhkan | Path |
|------|-------|-------------------------------|------|
| **Zaki** · Pemilik Proyek | — | Visi matang, pilot go-live, UAT manual | [manual/PILOT-GO-LIVE-CHECKLIST.md](./manual/PILOT-GO-LIVE-CHECKLIST.md), [domain/BUSINESS-LOGIC-E2E-VERIFICATION-2026-06.md](./domain/BUSINESS-LOGIC-E2E-VERIFICATION-2026-06.md), [requirements/VISION-ZAKI-MATURED.md](./requirements/VISION-ZAKI-MATURED.md) |
| **Budi** · CEO | `@budi` | Visi Pak Zaki, kickoff, koordinasi | [requirements/VISION-ZAKI-MATURED.md](./requirements/VISION-ZAKI-MATURED.md), [meetings/2026-06-01-VISION-ZAKI-DISCUSSION.md](./meetings/2026-06-01-VISION-ZAKI-DISCUSSION.md), [team/COORDINATION-PLAYBOOK.md](./team/COORDINATION-PLAYBOOK.md) |
| **Rina** · POS Domain | `@pos-expert` | Checklist MVP, domain keuangan | [requirements/MVP-CHECKLIST.md](./requirements/MVP-CHECKLIST.md), [domain/FINANCE-ECONOMICS-POS.md](./domain/FINANCE-ECONOMICS-POS.md) |
| **Dewi** · Business Analyst | `@analyst` | Checklist, backlog, data dictionary | [requirements/MVP-CHECKLIST.md](./requirements/MVP-CHECKLIST.md), [requirements/FEATURE-BACKLOG.md](./requirements/FEATURE-BACKLOG.md), [database/DATA-DICTIONARY.md](./database/DATA-DICTIONARY.md) |
| **Hendra** · Project Planner | `@planner` | Sprint plan, backlog, kickoff | [requirements/SPRINT-5-PLAN.md](./requirements/SPRINT-5-PLAN.md), [sprint/SPRINT-6-PROGRESS.md](./sprint/SPRINT-6-PROGRESS.md), [requirements/FEATURE-BACKLOG.md](./requirements/FEATURE-BACKLOG.md) |
| **Fitri** · Documentation | `@docs` | Standar error, error codes, indeks ini | [standards/ERROR-HANDLING-VALIDATION.md](./standards/ERROR-HANDLING-VALIDATION.md), [api/ERROR-CODES.md](./api/ERROR-CODES.md), [INDEX.md](./INDEX.md) |
| **Arif** · Integration | `@integration` | Arsitektur, error codes integrasi | [architecture/OVERVIEW.md](./architecture/OVERVIEW.md), [api/ERROR-CODES.md](./api/ERROR-CODES.md), [standards/ERROR-HANDLING-VALIDATION.md](./standards/ERROR-HANDLING-VALIDATION.md) |
| **Eko** · Algorithm | `@algorithm` | Domain keuangan, database, data dictionary | [domain/FINANCE-ECONOMICS-POS.md](./domain/FINANCE-ECONOMICS-POS.md), [database/DATABASE-ANALYSIS.md](./database/DATABASE-ANALYSIS.md), [database/DATA-DICTIONARY.md](./database/DATA-DICTIONARY.md) |
| **Maya** · UI/UX | `@ui-ux` | Design system, user flows, wireframes | [design/DESIGN-SYSTEM.md](./design/DESIGN-SYSTEM.md), [design/USER-FLOWS.md](./design/USER-FLOWS.md), [design/WIREFRAMES-KASIR.md](./design/WIREFRAMES-KASIR.md), [design/WIREFRAMES-STOREFRONT.md](./design/WIREFRAMES-STOREFRONT.md) |
| **Fajar** · Senior Developer (Backend/API) | `@senior-dev` | Arsitektur API, database, standar error, struktur codebase | [architecture/OVERVIEW.md](./architecture/OVERVIEW.md), [standards/CODEBASE-STRUCTURE.md](./standards/CODEBASE-STRUCTURE.md), [standards/ERROR-HANDLING-VALIDATION.md](./standards/ERROR-HANDLING-VALIDATION.md) |
| **Dimas** · Senior Frontend Developer | `@frontend` | ADR React stack, design system, dashboard Sprint 8 | [decisions/ADR-001-REACT-STACK.md](./decisions/ADR-001-REACT-STACK.md), [sprint/SPRINT-8-PROGRESS.md](./sprint/SPRINT-8-PROGRESS.md), [sprint/SPRINT-8-CLOSURE.md](./sprint/SPRINT-8-CLOSURE.md) |
| **Yoga** · DevOps | `@devops` | Arsitektur, deploy, smoke dev/staging | [standards/PRODUCTION-DEPLOYMENT.md](./standards/PRODUCTION-DEPLOYMENT.md), [architecture/OVERVIEW.md](./architecture/OVERVIEW.md), `npm run smoke:dev` |

---

## Katalog Lengkap

### Arsitektur

| Judul | Path | Deskripsi | Audience | Update | Tags |
|-------|------|-----------|----------|--------|------|
| Arsitektur Barokah Core POS | [architecture/OVERVIEW.md](./architecture/OVERVIEW.md) | Diagram sistem, layer API, stack teknologi, dan prinsip arsitektur monorepo | Fajar, Yoga, semua tim | 2026-06-01 | `#architecture` `#mvp` `#tech-stack` |
| ADR-001: Tetap Stack React | [decisions/ADR-001-REACT-STACK.md](./decisions/ADR-001-REACT-STACK.md) | Keputusan Pak Zaki: Next.js + Expo tetap; Vue/Nuxt ditolak; rekrut Dimas frontend | Budi, Dimas, Fajar, semua tim | 2026-06-01 | `#architecture` `#decision` `#frontend` |
| ADR-002: Konfirmasi Visi Pak Zaki (Q1–Q6) | [decisions/ADR-002-PAK-ZAKI-CONFIRMATIONS.md](./decisions/ADR-002-PAK-ZAKI-CONFIRMATIONS.md) | Vertical bahan bangunan, hold TTL 30m, web MVP, satu paket SaaS, varian Sprint 5 | Pak Zaki, Budi, semua tim | 2026-06-01 | `#decision` `#vision` `#requirements` |
| ADR-003: Scope Retail Omnichannel | [decisions/ADR-003-SCOPE-RETAIL-ONLINE-OFFLINE.md](./decisions/ADR-003-SCOPE-RETAIL-ONLINE-OFFLINE.md) | F&B/meja/KDS OUT OF SCOPE; online web + offline PWA toko fisik Fase 2 | Pak Zaki, Budi, semua tim | 2026-06-01 | `#decision` `#vision` `#omnichannel` `#scope` |
| ADR-004: Epic J Defaults Terkunci (Q-J01–Q-J08) | [decisions/ADR-004-EPIC-J-DEFAULTS-LOCKED.md](./decisions/ADR-004-EPIC-J-DEFAULTS-LOCKED.md) | Opsi 1 Unlock Epic J; pickup P0, guest, Midtrans, harga=stok kasir | Pak Zaki, Budi, Maya, Fajar, Dimas | 2026-06-02 | `#decision` `#omnichannel` `#epic-j` |

### API

| Judul | Path | Deskripsi | Audience | Update | Tags |
|-------|------|-----------|----------|--------|------|
| Error Codes Catalog | [api/ERROR-CODES.md](./api/ERROR-CODES.md) | Katalog error code API per modul, format response error, sync dengan `@barokah/shared` | Fitri, Fajar, Arif | 2026-06-01 | `#api` `#errors` `#mvp` |
| Sync API — Offline PWA | [api/SYNC.md](./api/SYNC.md) | Kontrak `POST/GET /api/v1/sync/*`, idempotensi antrian, konsumen PWA | Fajar, Dimas, Fitri | 2026-06-02 | `#api` `#offline` `#sync` `#pwa` |
| RFC Online Orders API (Epic J) | [api/ONLINE-ORDERS-RFC.md](./api/ONLINE-ORDERS-RFC.md) | Kontrak storefront publik, Midtrans, antrian fulfillment POS, draft Prisma `online_orders` | Fajar, Dimas, Arif, Eko | 2026-06-02 | `#api` `#epic-j` `#omnichannel` `#draft` |

### Testing

| Judul | Path | Deskripsi | Audience | Update | Tags |
|-------|------|-----------|----------|--------|------|
| Sprint 2 Backend Smoke (Auth/Master/Shift) | [testing/SPRINT-2-BACKEND-SMOKE.md](./testing/SPRINT-2-BACKEND-SMOKE.md) | Test case terstruktur untuk verifikasi endpoint inti Sprint 2 (SCR-S02 termasuk) | Fajar, Fitri, QA Internal | 2026-06-02 | `#testing` `#sprint` `#api` |
| Sprint 5 Manual Uji — Varian Produk | [testing/SPRINT-5-MANUAL-UJI.md](./testing/SPRINT-5-MANUAL-UJI.md) | Panduan uji manual web Bahasa Indonesia: induk/turunan varian, guard kasir | Pak Zaki, Dimas, Fajar | 2026-06-02 | `#testing` `#sprint` `#variants` `#kasir` |
| Sprint 6 UAT Final Checklist | [testing/SPRINT-6-UAT-FINAL.md](./testing/SPRINT-6-UAT-FINAL.md) | Checklist UAT final Sprint 6: bundling, multi-satuan, idempotent checkout, hold/recall dan flow `/pos` | Pak Zaki, Fajar, Dimas, Fitri | 2026-06-02 | `#testing` `#sprint` `#uat` `#bundling` `#multi-satuan` |
| Sprint 7 Frontend E2E Lite Checklist | [testing/SPRINT-7-FRONTEND-E2E-LITE.md](./testing/SPRINT-7-FRONTEND-E2E-LITE.md) | Checklist uji ringan Sprint 7 untuk sinkron policy bundle outlet-level dan mapping error pembayaran kasir | Pak Zaki, Dimas, Fajar, Fitri | 2026-06-02 | `#testing` `#sprint` `#frontend` `#e2e-lite` |
| Sprint 7 UAT Final Checklist | [testing/SPRINT-7-UAT-FINAL.md](./testing/SPRINT-7-UAT-FINAL.md) | UAT final Sprint 7: outlet bundle policy, gateway mapping, UI kasir, idempoten — status **CLOSED** | Pak Zaki, Fajar, Dimas, Arif, Fitri | 2026-06-02 | `#testing` `#sprint` `#uat` `#bundling` `#gateway` |
| Sprint 8 UAT Final Checklist | [testing/SPRINT-8-UAT-FINAL.md](./testing/SPRINT-8-UAT-FINAL.md) | UAT final Sprint 8: dashboard owner/manager, RBAC redirect, reports API, widget laporan harian — **CLOSED** | Pak Zaki, Fajar, Dimas, Fitri, Budi | 2026-06-02 | `#testing` `#sprint` `#uat` `#dashboard` `#reports` |
| Sprint 9 UAT Final Checklist | [testing/SPRINT-9-UAT-FINAL.md](./testing/SPRINT-9-UAT-FINAL.md) | UAT final Sprint 9: export CSV/JSON, multi-outlet API, AdminLayout, outlet picker, tombol ekspor — **CLOSED** | Pak Zaki, Fajar, Dimas, Fitri, Budi | 2026-06-02 | `#testing` `#sprint` `#uat` `#export` `#reports` |
| Sprint 10 UAT Final Checklist | [testing/SPRINT-10-UAT-FINAL.md](./testing/SPRINT-10-UAT-FINAL.md) | UAT final Sprint 10: void+approval manager, struk digital, ESC/POS stub, UI kasir/admin — **CLOSED** | Pak Zaki, Fajar, Dimas, Fitri, Budi, Arif | 2026-06-02 | `#testing` `#sprint` `#uat` `#void` `#receipt` |
| Sprint 11 Test Plan — Offline PWA | [testing/SPRINT-11-TEST-PLAN.md](./testing/SPRINT-11-TEST-PLAN.md) | 38 TC: antrean offline, sync, idempotensi, banner, PWA shell | Citra, Fajar, Dimas | 2026-06-02 | `#testing` `#sprint` `#offline` `#pwa` |
| Sprint 11 UAT Final Checklist | [testing/SPRINT-11-UAT-FINAL.md](./testing/SPRINT-11-UAT-FINAL.md) | UAT final Sprint 11: sync API, PWA, IndexedDB, wire `/sync/queue` — **CLOSED** | Pak Zaki, Citra, Fajar, Dimas, Budi | 2026-06-02 | `#testing` `#sprint` `#uat` `#offline` `#pwa` |
| Sprint 12 Test Plan — BullMQ & Offline Hardening | [testing/SPRINT-12-TEST-PLAN.md](./testing/SPRINT-12-TEST-PLAN.md) | 46 TC: BullMQ worker, konflik UI, hold offline, product cache — **CLOSED** | Pak Zaki, Citra, Fajar, Yoga, Dimas | 2026-06-02 | `#testing` `#sprint` `#offline` `#bullmq` |
| Sprint 12 UAT Final Checklist | [testing/SPRINT-12-UAT-FINAL.md](./testing/SPRINT-12-UAT-FINAL.md) | UAT final Sprint 12 gabungan: BullMQ, konflik UI, hold offline, katalog cache — **CLOSED** | Pak Zaki, Citra, Fajar, Dimas, Yoga, Budi | 2026-06-02 | `#testing` `#sprint` `#uat` `#offline` `#bullmq` `#closed` |
| Sprint 13 Test Plan — Hold Idempotency · BullMQ · Storefront | [testing/SPRINT-13-TEST-PLAN.md](./testing/SPRINT-13-TEST-PLAN.md) | 28 TC: hold idempotency API+PWA, BullMQ metrics, storefront scaffold smoke — **CLOSED** | Pak Zaki, Citra, Fajar, Dimas | 2026-06-05 | `#testing` `#sprint` `#offline` `#epic-j` `#closed` |
| Sprint 13 UAT Final Checklist | [testing/SPRINT-13-UAT-FINAL.md](./testing/SPRINT-13-UAT-FINAL.md) | UAT final Sprint 13: hold idempotency, BullMQ metrics, storefront mock — **CLOSED** | Pak Zaki, Citra, Fajar, Dimas, Budi | 2026-06-05 | `#testing` `#sprint` `#uat` `#offline` `#epic-j` `#closed` |
| Sprint 14 Test Plan — Epic J Online Orders Live | [testing/SPRINT-14-TEST-PLAN.md](./testing/SPRINT-14-TEST-PLAN.md) | 18 TC: storefront API live, Midtrans mock/webhook, fulfillment kasir — **CLOSED** | Pak Zaki, Citra, Fajar, Dimas | 2026-06-05 | `#testing` `#sprint` `#epic-j` `#omnichannel` `#closed` |
| Sprint 14 UAT Final Checklist | [testing/SPRINT-14-UAT-FINAL.md](./testing/SPRINT-14-UAT-FINAL.md) | UAT final Sprint 14: online_orders API live, storefront wiring, antrian kasir — **CLOSED** | Pak Zaki, Citra, Fajar, Dimas, Arif, Budi | 2026-06-05 | `#testing` `#sprint` `#uat` `#epic-j` `#omnichannel` `#closed` |
| Sprint 16 UAT Final Checklist | [testing/SPRINT-16-UAT-FINAL.md](./testing/SPRINT-16-UAT-FINAL.md) | UAT final Sprint 16: delivery checkout, Midtrans mock-only, rate limit 429 UI, kasir queue — **CLOSED** | Pak Zaki, Citra, Fajar, Dimas, Arif, Budi | 2026-06-06 | `#testing` `#sprint` `#uat` `#epic-j` `#omnichannel` `#closed` |
| Web Completion UAT Phase 4 | [testing/WEB-COMPLETION-UAT-2026-06.md](./testing/WEB-COMPLETION-UAT-2026-06.md) | Checklist UAT Phase 4: promo POS, storefront orders, auth hardening, expired orders | Pak Zaki, Citra, Dimas, Fajar, Fitri | 2026-06-06 | `#testing` `#uat` `#web` `#completion` |

### Database

| Judul | Path | Deskripsi | Audience | Update | Tags |
|-------|------|-----------|----------|--------|------|
| Analisis Database | [database/DATABASE-ANALYSIS.md](./database/DATABASE-ANALYSIS.md) | Ringkasan eksekutif desain DB MVP: 22 tabel, 7 domain, keputusan arsitektural | Fajar, Eko | 2026-06-01 | `#database` `#mvp` `#architecture` |
| Data Dictionary | [database/DATA-DICTIONARY.md](./database/DATA-DICTIONARY.md) | Definisi field per tabel Prisma dalam Bahasa Indonesia | Fajar, Dewi, Eko | 2026-06-01 | `#database` `#schema` `#mvp` |
| Relational Design | [database/RELATIONAL-DESIGN.md](./database/RELATIONAL-DESIGN.md) | ERD, relasi antar entitas, constraint, dan index strategy | Fajar | 2026-06-01 | `#database` `#schema` `#mvp` |

### Design

| Judul | Path | Deskripsi | Audience | Update | Tags |
|-------|------|-----------|----------|--------|------|
| Design System | [design/DESIGN-SYSTEM.md](./design/DESIGN-SYSTEM.md) | Token warna, tipografi, spacing, komponen touch-first untuk kasir MVP | Maya, Fajar | 2026-06-01 | `#design` `#ui` `#mvp` |
| User Flows — Modul Kasir | [design/USER-FLOWS.md](./design/USER-FLOWS.md) | Alur operasional kasir (login, transaksi, hold, void) dengan diagram Mermaid | Maya, Dewi, Fajar | 2026-06-01 | `#design` `#ux` `#kasir` `#mvp` |
| Wireframes Kasir | [design/WIREFRAMES-KASIR.md](./design/WIREFRAMES-KASIR.md) | Wireframe text-based layar kasir web & mobile MVP | Maya, Fajar | 2026-06-01 | `#design` `#ux` `#kasir` `#mvp` |
| Wireframes Storefront — Epic J | [design/WIREFRAMES-STOREFRONT.md](./design/WIREFRAMES-STOREFRONT.md) | Wireframe P0 guest: katalog, PDP, keranjang, checkout pickup, Midtrans, konfirmasi (SCR-J01–J07) | Maya, Dimas, Fajar, Citra | 2026-06-02 | `#design` `#ux` `#storefront` `#epic-j` `#omnichannel` |

### Domain

| Judul | Path | Deskripsi | Audience | Update | Tags |
|-------|------|-----------|----------|--------|------|
| Keuangan & Ekonomi POS | [domain/FINANCE-ECONOMICS-POS.md](./domain/FINANCE-ECONOMICS-POS.md) | Domain keuangan retail SMB Indonesia: margin, arus kas, KPI, pajak bisnis | Rina, Dewi, Budi, Eko | 2026-06-01 | `#domain` `#finance` `#mvp` |
| Modul Piutang, Utang & Deposit | [domain/CREDIT-DEPOSIT-MODULE.md](./domain/CREDIT-DEPOSIT-MODULE.md) | Spec AR/AP/deposit Fase 2: tempo, utang PO, deposit pelanggan, POS integration | Rina, Eko, Fajar, Dimas, Citra | 2026-06-09 | `#domain` `#finance` `#fase2` `#piutang` `#deposit` |
| Integrasi Piutang (AR) & Utang (AP) | [domain/FINANCE-AR-AP-INTEGRATION.md](./domain/FINANCE-AR-AP-INTEGRATION.md) | Hub keuangan terpadu `/dashboard/finance`: cross-link AR↔CRM, AP↔PO, POS tempo, sidebar Keuangan | Rina, Eko, Fajar, Dimas, Citra | 2026-06-09 | `#domain` `#finance` `#fase2` `#piutang` `#utang` `#integration` |
| Laporan Keuangan Management | [domain/FINANCIAL-REPORTS.md](./domain/FINANCIAL-REPORTS.md) | P&L, piutang, utang, arus kas, ringkasan harian — periode harian/mingguan/bulanan/tahunan + cetak/PDF | Rina, Eko, Fajar, Dimas | 2026-06-09 | `#domain` `#finance` `#reports` `#mvp` |
| Business Logic Audit Fase 1–4 | [domain/BUSINESS-LOGIC-AUDIT-FASE1-4-2026-06.md](./domain/BUSINESS-LOGIC-AUDIT-FASE1-4-2026-06.md) | Audit komprehensif Fase 1 **98%**, Fase 2 **95%**, Fase 3 defer, Web Completion 100% | Pak Zaki, Rina, Eko, Citra, Budi | 2026-06-07 | `#domain` `#audit` `#mvp` `#fase2` `#roadmap` |
| Business Logic E2E Verification | [domain/BUSINESS-LOGIC-E2E-VERIFICATION-2026-06.md](./domain/BUSINESS-LOGIC-E2E-VERIFICATION-2026-06.md) | Verifikasi 13 alur bisnis harian toko bahan bangunan — **13/13 PASS** | Pak Zaki, Rina, Eko, Citra | 2026-06-07 | `#domain` `#audit` `#e2e` `#mvp` `#fase2` |
| Outlet Data Integrity Audit | [domain/OUTLET-DATA-INTEGRITY-AUDIT-2026-06.md](./domain/OUTLET-DATA-INTEGRITY-AUDIT-2026-06.md) | Audit isolasi data per cabang (`outletId`): PO guard, POS picker, shift scoped, transfer — UAT di [PILOT-GO-LIVE-CHECKLIST Skenario J](./manual/PILOT-GO-LIVE-CHECKLIST.md) | Pak Zaki, Rina, Fajar, Citra | 2026-06-09 | `#domain` `#audit` `#outlet` `#multi-outlet` |
| Business Logic Audit 2026 | [domain/BUSINESS-LOGIC-AUDIT-2026-06.md](./domain/BUSINESS-LOGIC-AUDIT-2026-06.md) | Audit bisnis Phase 7–10 — regresi edge cases ALL PASS | Rina, Eko, Citra | 2026-06-06 | `#domain` `#audit` `#mvp` |
| Business Logic Audit Fase 2 | [domain/BUSINESS-LOGIC-AUDIT-FASE2-2026-06.md](./domain/BUSINESS-LOGIC-AUDIT-FASE2-2026-06.md) | Audit omnichannel: online PAID deduct, offline idempotent, promo anti-stack | Rina, Eko, Citra | 2026-06-07 | `#domain` `#audit` `#fase2` `#omnichannel` |

### Rapat

| Judul | Path | Deskripsi | Audience | Update | Tags |
|-------|------|-----------|----------|--------|------|
| Rapat Kickoff Tim — 1 Juni 2026 | [meetings/2026-06-01-KICKOFF-MEETING.md](./meetings/2026-06-01-KICKOFF-MEETING.md) | Notulen kickoff MVP: fitur P0 locked, workflow kasir, Sprint 1–4 | Semua tim | 2026-06-01 | `#meeting` `#mvp` `#planning` |
| Rapat Matangkan Visi Pak Zaki | [meetings/2026-06-01-VISION-ZAKI-DISCUSSION.md](./meetings/2026-06-01-VISION-ZAKI-DISCUSSION.md) | Diskusi 11 tim: visi 10 modul, keputusan VZ-01–16, roadmap 3 fase | Semua tim, Pak Zaki | 2026-06-01 | `#meeting` `#vision` `#planning` |
| Gap Analysis Visi vs Proyek | [meetings/2026-06-01-VISION-ZAKI-GAP-ANALYSIS.md](./meetings/2026-06-01-VISION-ZAKI-GAP-ANALYSIS.md) | Tabel gap per section dokumen Pak Zaki vs schema/backlog MVP | Fajar, Hendra, Dewi | 2026-06-01 | `#meeting` `#vision` `#requirements` |

### Requirements

| Judul | Path | Deskripsi | Audience | Update | Tags |
|-------|------|-----------|----------|--------|------|
| Visi Produk Matang (Pak Zaki) | [requirements/VISION-ZAKI-MATURED.md](./requirements/VISION-ZAKI-MATURED.md) | Visi v1.2: omnichannel retail, § Model Bisnis Operasi, F&B OUT OF SCOPE | Pak Zaki, Budi, semua tim | 2026-06-01 | `#requirements` `#vision` `#roadmap` `#omnichannel` |
| Feature Backlog | [requirements/FEATURE-BACKLOG.md](./requirements/FEATURE-BACKLOG.md) | Backlog v1.4: Epic J UNLOCKED (ADR-004), US-J-01–07, Track B Sprint 13 | Hendra, Dewi, Budi | 2026-06-02 | `#requirements` `#backlog` `#mvp` `#omnichannel` `#epic-j` |
| Checklist MVP — Modul Kasir | [requirements/MVP-CHECKLIST.md](./requirements/MVP-CHECKLIST.md) | Checklist functional & non-functional requirement P0 modul kasir | Rina, Dewi, semua tim | 2026-06-01 | `#requirements` `#checklist` `#mvp` `#kasir` |
| Sprint 1 Plan — Foundation | [requirements/SPRINT-1-PLAN.md](./requirements/SPRINT-1-PLAN.md) | Rencana Sprint 1 (scope unchanged); footnote Q1–Q6 confirmed | Hendra, Fajar, Dimas, Yoga | 2026-06-01 | `#requirements` `#sprint` `#planning` |
| Sprint 2 Plan — Master Data & Shift | [requirements/SPRINT-2-PLAN.md](./requirements/SPRINT-2-PLAN.md) | Sprint 2 (16–29 Jun): katalog bahan bangunan, buka shift, hold TTL AC ref | Hendra, Fajar, Dimas, Rina | 2026-06-01 | `#requirements` `#sprint` `#planning` `#building-materials` |
| Sprint 5 Plan — Product Variant Foundation | [requirements/SPRINT-5-PLAN.md](./requirements/SPRINT-5-PLAN.md) | Fondasi varian produk sebelum bundling; guard kasir + UI master — **CLOSED** | Hendra, Fajar, Dimas, Rina | 2026-06-02 | `#requirements` `#sprint` `#planning` `#variants` |
| Sprint 6 Plan — Jalur Backend/Integrasi | [requirements/SPRINT-6-PLAN.md](./requirements/SPRINT-6-PLAN.md) | Rencana Sprint 6 yang telah difinalkan dengan checklist akhir dan referensi UAT final | Hendra, Fajar, Arif, Fitri | 2026-06-02 | `#requirements` `#sprint` `#planning` `#bundling` `#multi-satuan` |
| Sprint 7 Plan — Backend, Integrasi & Frontend | [requirements/SPRINT-7-PLAN.md](./requirements/SPRINT-7-PLAN.md) | Rencana Sprint 7 outlet bundle policy, gateway mapping, sinkron UI kasir — **CLOSED** | Hendra, Fajar, Dimas, Arif | 2026-06-02 | `#requirements` `#sprint` `#planning` `#bundling` `#gateway` |
| Sprint 8 Plan — Laporan Harian & Dashboard | [requirements/SPRINT-8-PLAN.md](./requirements/SPRINT-8-PLAN.md) | Rencana Sprint 8 reports API + dashboard admin owner/manager — **CLOSED** | Hendra, Fajar, Dimas, Fitri | 2026-06-02 | `#requirements` `#sprint` `#planning` `#dashboard` `#reports` |
| Sprint 9 Plan — Export & Multi-Outlet (Gabungan) | [requirements/SPRINT-9-PLAN.md](./requirements/SPRINT-9-PLAN.md) | Rencana Sprint 9 export CSV/JSON + multi-outlet API + admin shell + picker + ekspor UI — **CLOSED** | Hendra, Fajar, Dimas, Fitri | 2026-06-02 | `#requirements` `#sprint` `#planning` `#export` `#reports` |
| Sprint 10 Plan — Void, Struk & Thermal Stub (Gabungan) | [requirements/SPRINT-10-PLAN.md](./requirements/SPRINT-10-PLAN.md) | Rencana Sprint 10 void/refund/receipt API + UI kasir/admin + thermal stub — **CLOSED** | Hendra, Fajar, Dimas, Arif, Fitri | 2026-06-02 | `#requirements` `#sprint` `#void` `#receipt` |
| Epic J — Online Storefront Discovery | [requirements/EPIC-J-ONLINE-STOREFRONT-DISCOVERY.md](./requirements/EPIC-J-ONLINE-STOREFRONT-DISCOVERY.md) | Discovery **CLOSED**; Q-J01–08 CONFIRMED; checklist J1–J9 | Pak Zaki, Rina, Dewi, Hendra, Maya | 2026-06-02 | `#requirements` `#discovery` `#omnichannel` `#epic-j` |
| Epic J — User Stories P0 (US-J-01–07) | [requirements/EPIC-J-USER-STORIES.md](./requirements/EPIC-J-USER-STORIES.md) | User story + AC P0 storefront: katalog, keranjang, pickup, Midtrans, antrian POS | Dewi, Maya, Fajar, Dimas, Citra | 2026-06-02 | `#requirements` `#user-story` `#epic-j` `#omnichannel` |
| Sprint 12 Plan — Offline Hardening + Epic J Discovery (Gabungan) | [requirements/SPRINT-12-PLAN.md](./requirements/SPRINT-12-PLAN.md) | Track A: BullMQ/konflik/hold/cache; Track B: discovery Epic J + Q-J — **CLOSED** | Pak Zaki, Hendra, Fajar, Rina, Dewi, Dimas | 2026-06-02 | `#requirements` `#sprint` `#offline` `#omnichannel` `#closed` |
| Sprint 13 Plan — Offline Polish + Epic J Storefront | [requirements/SPRINT-13-PLAN.md](./requirements/SPRINT-13-PLAN.md) | Track A: hold idempotency; Track B: RFC + scaffold storefront mock — **CLOSED** | Pak Zaki, Hendra, Fajar, Dimas, Maya, Budi | 2026-06-05 | `#requirements` `#sprint` `#offline` `#omnichannel` `#epic-j` `#closed` |
| Sprint 14 Plan — Epic J Online Orders (API + Storefront Live) | [requirements/SPRINT-14-PLAN.md](./requirements/SPRINT-14-PLAN.md) | Epic J P0: modul `online_orders`, storefront live, Midtrans mock, antrian kasir — **CLOSED** | Pak Zaki, Hendra, Fajar, Dimas, Citra, Budi | 2026-06-05 | `#requirements` `#sprint` `#epic-j` `#omnichannel` `#closed` |

### Sprint

| Judul | Path | Deskripsi | Audience | Update | Tags |
|-------|------|-----------|----------|--------|------|
| Sprint 5 Progress — Varian Produk | [sprint/SPRINT-5-PROGRESS.md](./sprint/SPRINT-5-PROGRESS.md) | Progress frontend+backend, verifikasi CI, URL uji — status **CLOSED** | Pak Zaki, Hendra, Fajar, Dimas | 2026-06-02 | `#sprint` `#variants` `#progress` |
| Sprint 5 Closure — Varian Produk | [sprint/SPRINT-5-CLOSURE.md](./sprint/SPRINT-5-CLOSURE.md) | Closure report Sprint 5; deliverables, risiko, prioritas Sprint 6 | Pak Zaki, Budi, Fitri | 2026-06-02 | `#sprint` `#closure` `#variants` |
| Sprint 6 Progress — Final | [sprint/SPRINT-6-PROGRESS.md](./sprint/SPRINT-6-PROGRESS.md) | Progress final Sprint 6 setelah verifikasi teknis dan UAT backend+frontend | Pak Zaki, Hendra, Fajar, Dimas | 2026-06-02 | `#sprint` `#progress` `#final` `#bundling` `#multi-satuan` |
| Sprint 6 Closure — Final | [sprint/SPRINT-6-CLOSURE.md](./sprint/SPRINT-6-CLOSURE.md) | Closure final Sprint 6 dengan status CLOSED dan handoff prioritas Sprint berikutnya | Pak Zaki, Budi, Fitri | 2026-06-02 | `#sprint` `#closure` `#final` `#bundling` `#multi-satuan` |
| Sprint 7 Progress — Final | [sprint/SPRINT-7-PROGRESS.md](./sprint/SPRINT-7-PROGRESS.md) | Progress final Sprint 7 (backend + frontend): outlet bundle policy, gateway mapping, verifikasi penuh — **CLOSED** | Pak Zaki, Hendra, Fajar, Dimas, Arif | 2026-06-02 | `#sprint` `#progress` `#final` `#bundling` `#gateway` |
| Sprint 7 Closure — Final | [sprint/SPRINT-7-CLOSURE.md](./sprint/SPRINT-7-CLOSURE.md) | Closure final Sprint 7 dengan status CLOSED, resolusi EPERM Prisma, handoff Sprint berikutnya | Pak Zaki, Budi, Fitri | 2026-06-02 | `#sprint` `#closure` `#final` `#bundling` `#gateway` |
| Sprint 8 Progress — Dashboard Admin | [sprint/SPRINT-8-PROGRESS.md](./sprint/SPRINT-8-PROGRESS.md) | Progress Sprint 8: layout `/dashboard`, widget laporan harian, RBAC login, test web — **CLOSED** | Pak Zaki, Dimas, Fajar, Fitri | 2026-06-02 | `#sprint` `#progress` `#dashboard` `#reports` |
| Sprint 8 Closure — Dashboard Admin | [sprint/SPRINT-8-CLOSURE.md](./sprint/SPRINT-8-CLOSURE.md) | Closure Sprint 8 gabungan API+UI; UAT final PASS; handoff 3 prioritas Sprint 9 | Pak Zaki, Budi, Fitri | 2026-06-02 | `#sprint` `#closure` `#dashboard` `#reports` |
| Sprint 9 Progress — Export & Multi-Outlet (Gabungan) | [sprint/SPRINT-9-PROGRESS.md](./sprint/SPRINT-9-PROGRESS.md) | Progress Sprint 9 gabungan: export, multi-outlet, AdminLayout, picker, ekspor UI, UAT — **CLOSED** | Pak Zaki, Fajar, Dimas, Fitri | 2026-06-02 | `#sprint` `#progress` `#export` `#reports` |
| Sprint 9 Closure — Export & Multi-Outlet (Gabungan) | [sprint/SPRINT-9-CLOSURE.md](./sprint/SPRINT-9-CLOSURE.md) | Closure Sprint 9 gabungan; UAT PASS; handoff 3 prioritas Sprint 10 (void, struk, hardening) | Pak Zaki, Budi, Fitri | 2026-06-02 | `#sprint` `#closure` `#export` `#reports` |
| Sprint 10 Progress — Void & Struk (Gabungan) | [sprint/SPRINT-10-PROGRESS.md](./sprint/SPRINT-10-PROGRESS.md) | Progress Sprint 10 gabungan: void, struk, thermal stub, verify API 54/54 + web 40/40 — **CLOSED** | Pak Zaki, Fajar, Dimas, Fitri | 2026-06-02 | `#sprint` `#progress` `#void` `#receipt` |
| Sprint 10 Closure — Void & Struk (Gabungan) | [sprint/SPRINT-10-CLOSURE.md](./sprint/SPRINT-10-CLOSURE.md) | Closure Sprint 10 gabungan; UAT PASS; handoff Sprint 11 offline PWA + Epic J discovery | Pak Zaki, Budi, Fitri, Hendra | 2026-06-02 | `#sprint` `#closure` `#void` `#receipt` |
| Sprint 11 Plan — Offline PWA (Gabungan) | [requirements/SPRINT-11-PLAN.md](./requirements/SPRINT-11-PLAN.md) | Plan Sprint 11: sync API + PWA kasir, IndexedDB, `/sync/queue` — **CLOSED** | Pak Zaki, Hendra, Dimas, Fajar | 2026-06-02 | `#sprint` `#offline` `#pwa` `#closed` |
| Sprint 11 Progress — Offline PWA (Gabungan) | [sprint/SPRINT-11-PROGRESS.md](./sprint/SPRINT-11-PROGRESS.md) | Progress gabungan 4 lane; API 61/61, web 50/50 — **CLOSED** | Pak Zaki, Dimas, Fajar, Citra, Fitri | 2026-06-02 | `#sprint` `#progress` `#offline` `#pwa` `#closed` |
| Sprint 11 Closure — Offline PWA (Gabungan) | [sprint/SPRINT-11-CLOSURE.md](./sprint/SPRINT-11-CLOSURE.md) | Closure Sprint 11; UAT PASS; handoff Sprint 12 BullMQ + konflik UI | Pak Zaki, Budi, Fitri, Hendra | 2026-06-02 | `#sprint` `#closure` `#offline` `#pwa` `#closed` |
| Sprint 12 Progress — Offline Hardening (Gabungan) | [sprint/SPRINT-12-PROGRESS.md](./sprint/SPRINT-12-PROGRESS.md) | Progress gabungan: API 68/68, web 57/57, Epic J discovery — **CLOSED** | Pak Zaki, Fajar, Dimas, Yoga, Citra | 2026-06-02 | `#sprint` `#progress` `#offline` `#bullmq` `#closed` |
| Sprint 12 Progress — Offline PWA (Frontend detail) | [sprint/SPRINT-12-FRONTEND-PROGRESS.md](./sprint/SPRINT-12-FRONTEND-PROGRESS.md) | Detail lane frontend: konflik, hold IndexedDB, katalog cache | Pak Zaki, Dimas, Bima, Citra | 2026-06-02 | `#sprint` `#progress` `#offline` `#pwa` `#frontend` |
| Sprint 12 Closure — Offline Hardening + Epic J Discovery (Gabungan) | [sprint/SPRINT-12-CLOSURE.md](./sprint/SPRINT-12-CLOSURE.md) | Closure gabungan; UAT PASS; API 68/68 + web 57/57; handoff Sprint 13 | Pak Zaki, Budi, Fajar, Dimas, Yoga, Hendra | 2026-06-02 | `#sprint` `#closure` `#offline` `#bullmq` `#closed` |
| Sprint 13 Progress — Offline Polish + Epic J Scaffold | [sprint/SPRINT-13-PROGRESS.md](./sprint/SPRINT-13-PROGRESS.md) | Progress gabungan: API 69/69, web 59/59, storefront mock — **CLOSED** | Pak Zaki, Fajar, Dimas, Citra, Budi | 2026-06-05 | `#sprint` `#progress` `#offline` `#epic-j` `#closed` |
| Sprint 13 Closure — Offline Polish + Epic J Scaffold | [sprint/SPRINT-13-CLOSURE.md](./sprint/SPRINT-13-CLOSURE.md) | Closure Sprint 13; UAT PASS; handoff Sprint 14 `online_orders` API live | Pak Zaki, Budi, Fajar, Dimas, Hendra | 2026-06-05 | `#sprint` `#closure` `#offline` `#epic-j` `#closed` |
| Sprint 14 Progress — Epic J Online Orders | [sprint/SPRINT-14-PROGRESS.md](./sprint/SPRINT-14-PROGRESS.md) | Progress Sprint 14: API 75/75, web 60/60, storefront live — **CLOSED** | Pak Zaki, Fajar, Dimas, Citra, Budi | 2026-06-05 | `#sprint` `#progress` `#epic-j` `#omnichannel` `#closed` |
| Sprint 14 Closure — Epic J Online Orders Live | [sprint/SPRINT-14-CLOSURE.md](./sprint/SPRINT-14-CLOSURE.md) | Closure Sprint 14; UAT PASS; handoff Sprint 15 delivery + Midtrans sandbox | Pak Zaki, Budi, Fajar, Dimas, Hendra | 2026-06-05 | `#sprint` `#closure` `#epic-j` `#omnichannel` `#closed` |
| Sprint 16 Web Plan — Omnichannel Hardening | [sprint/SPRINT-16-WEB-PLAN.md](./sprint/SPRINT-16-WEB-PLAN.md) | Plan Sprint 16: delivery E2E, Midtrans mock, rate limit 429, admin katalog — **CLOSED** | Pak Zaki, Hendra, Dimas, Fajar, Citra, Budi | 2026-06-06 | `#sprint` `#planning` `#epic-j` `#omnichannel` `#closed` |
| Sprint 16 Web Progress — Omnichannel Hardening | [sprint/SPRINT-16-WEB-PROGRESS.md](./sprint/SPRINT-16-WEB-PROGRESS.md) | Progress Sprint 16: API 117/117, web 97/97, UAT mock-only Midtrans — **CLOSED** | Pak Zaki, Dimas, Fajar, Citra, Budi | 2026-06-06 | `#sprint` `#progress` `#epic-j` `#omnichannel` `#closed` |
| Web Completion Plan | [sprint/WEB-COMPLETION-PLAN.md](./sprint/WEB-COMPLETION-PLAN.md) | Plan bertahap web Phase 1–4 — **COMPLETE** | Pak Zaki, Dimas, Fajar, Hendra | 2026-06-06 | `#sprint` `#web` `#completion` `#closed` |
| Web Completion Progress Pass 4 | [sprint/WEB-COMPLETION-PROGRESS.md](./sprint/WEB-COMPLETION-PROGRESS.md) | Phase 4 paralel: promo POS, storefront orders, auth, expired, UX — **DONE** | Pak Zaki, Dimas, Fajar, Eko, Fitri | 2026-06-06 | `#sprint` `#web` `#completion` `#phase-4` |
| Fase 1+2 Gap Close | [sprint/FASE1-2-GAP-CLOSE.md](./sprint/FASE1-2-GAP-CLOSE.md) | Gap close + loyalty redeem + PPN UI sync — **FINAL** (417/417 tests) | Pak Zaki, Budi, Fajar, Dimas, Citra | 2026-06-07 | `#sprint` `#fase1` `#fase2` `#gap-close` `#closed` |

### Manual

| Judul | Path | Deskripsi | Audience | Update | Tags |
|-------|------|-----------|----------|--------|------|
| Pilot Go-Live Checklist | [manual/PILOT-GO-LIVE-CHECKLIST.md](./manual/PILOT-GO-LIVE-CHECKLIST.md) | Checklist infra, master data, cabang (`/dashboard/outlets`), profil toko (`/dashboard/store`), shift kasir, UAT manual A–J (multi cabang) | Pak Zaki, Yoga, Citra, Manager | 2026-06-09 | `#manual` `#pilot` `#go-live` `#uat` `#outlet` `#multi-outlet` |
| Kasir Quick Start | [manual/KASIR-QUICK-START.md](./manual/KASIR-QUICK-START.md) | Panduan singkat kasir: buka shift, jual, hold, bayar, tutup shift | Kasir, Manager, Pak Zaki | 2026-06-07 | `#manual` `#kasir` `#onboarding` |
| Offline Sync — Conflict & Queue | [algorithm/OFFLINE-SYNC.md](./algorithm/OFFLINE-SYNC.md) | Kebijakan konflik LWW vs manual, urutan antrian idempotent, kontrak API/frontend | Pak Zaki, Eko, Fajar, Dimas, Citra | 2026-06-02 | `#algorithm` `#offline` `#sync` `#pwa` |
| Thermal Print MVP Stub | [integration/THERMAL-PRINT-MVP-STUB.md](./integration/THERMAL-PRINT-MVP-STUB.md) | Ringkasan stub browser print + konsumsi `escpos` API untuk Sprint 10 | Arif, Dimas | 2026-06-02 | `#integration` `#receipt` |
| Integrasi Thermal ESC/POS (Stub) | [integration/THERMAL-ESC-POS.md](./integration/THERMAL-ESC-POS.md) | Spec pola integrasi printer thermal + konsumsi `escpos.payload` dari API | Arif, Fajar, Dimas | 2026-06-02 | `#integration` `#receipt` `#hardware` |
| QRIS Phase 10 MVP | [integration/QRIS-PHASE-10.md](./integration/QRIS-PHASE-10.md) | Alur QRIS mock web/mobile + polling API + business logic stock deduct | Arif, Fajar, Dimas | 2026-06-06 | `#integration` `#qris` `#payment` |
| Midtrans Live Production | [integration/MIDTRANS-LIVE-PRODUCTION.md](./integration/MIDTRANS-LIVE-PRODUCTION.md) | Guardrails live/sandbox/mock Midtrans tenant keys | Arif, Fajar | 2026-06-06 | `#integration` `#midtrans` |

### Standar

| Judul | Path | Deskripsi | Audience | Update | Tags |
|-------|------|-----------|----------|--------|------|
| Struktur Codebase | [standards/CODEBASE-STRUCTURE.md](./standards/CODEBASE-STRUCTURE.md) | Layout monorepo, konvensi penamaan, aturan import, batas modul NestJS/Next.js/Expo | Fajar, Yoga, semua dev | 2026-06-01 | `#standards` `#architecture` `#mvp` `#codebase` |
| Error Handling & Validasi | [standards/ERROR-HANDLING-VALIDATION.md](./standards/ERROR-HANDLING-VALIDATION.md) | Standar wajib P0: error handling, validasi input/output, API envelope | Fajar, Fitri, semua dev | 2026-06-01 | `#standards` `#api` `#errors` `#mvp` |
| Production Deployment | [standards/PRODUCTION-DEPLOYMENT.md](./standards/PRODUCTION-DEPLOYMENT.md) | CSP, secure cookies, env guardrails, deploy checklist Phase 10 | Yoga, Fajar | 2026-06-06 | `#standards` `#deploy` `#security` |

### Tim

| Judul | Path | Deskripsi | Audience | Update | Tags |
|-------|------|-----------|----------|--------|------|
| Playbook Koordinasi Tim | [team/COORDINATION-PLAYBOOK.md](./team/COORDINATION-PLAYBOOK.md) | Panduan operasional koordinasi antar agent, handoff, parallel vs sequential | Semua agent | 2026-06-01 | `#team` `#coordination` |
| Knowledge Base Tim 2026 | [team/KNOWLEDGE-BASE.md](./team/KNOWLEDGE-BASE.md) | Index keahlian per divisi, trends 2026, link skill files | Semua agent | 2026-06-01 | `#team` `#knowledge-base` |

### Meta (Indeks & Entry Point)

| Judul | Path | Deskripsi | Audience | Update | Tags |
|-------|------|-----------|----------|--------|------|
| Indeks Dokumentasi (file ini) | [INDEX.md](./INDEX.md) | Master index: navigasi role, katalog, onboarding, pemeliharaan | Semua tim | 2026-06-01 | `#meta` `#index` |
| README Folder docs | [README.md](./README.md) | Entry point folder `docs/` — pointer ke indeks & struktur folder | Semua tim | 2026-06-01 | `#meta` `#onboarding` |

### Referensi Proyek (di luar `docs/`)

| Judul | Path | Deskripsi | Audience | Update | Tags |
|-------|------|-----------|----------|--------|------|
| README Proyek | [../README.md](../README.md) | Quick start, struktur monorepo, daftar tim agent | Semua | 2026-06-01 | `#project` `#onboarding` |
| AGENTS.md — Tim Agent | [../AGENTS.md](../AGENTS.md) | Struktur tim, protokol komunikasi, koordinasi, roadmap modul | Semua agent | 2026-06-01 | `#team` `#agents` `#coordination` |
| Dokumen Rencana Pak Zaki (sumber) | [../.cursor/dokument rencana zaki.md](../.cursor/dokument%20rencana%20zaki.md) | Spesifikasi fitur lengkap 10 modul — dokumen asli pemilik proyek (read-only referensi) | Pak Zaki, semua tim | 2026-06-01 | `#vision` `#requirements` `#source` |
| CHANGELOG | [../CHANGELOG.md](../CHANGELOG.md) | Riwayat perubahan semver per release di root repo | Fitri, Yoga | 2026-06-02 | `#changelog` `#release` |

---

## Alur Baca Recommended (Onboarding)

Urutan baca untuk anggota tim baru atau agent yang baru join proyek:

```
1. ../README.md                          → Setup & gambaran proyek
2. ../AGENTS.md                          → Struktur tim & protokol
3. team/COORDINATION-PLAYBOOK.md         → Cara koordinasi antar agent
4. meetings/2026-06-01-KICKOFF-MEETING.md → Konteks keputusan MVP
5. requirements/VISION-ZAKI-MATURED.md   → North star produk (Pak Zaki)
6. requirements/MVP-CHECKLIST.md         → Scope fitur P0
7. architecture/OVERVIEW.md              → Arsitektur teknis
8. [Role-specific docs dari tabel Navigasi Cepat]
9. team/KNOWLEDGE-BASE.md                → Praktik terbaru divisi masing-masing
```

**Developer Backend (Fajar):** tambahkan `standards/CODEBASE-STRUCTURE.md` → `standards/ERROR-HANDLING-VALIDATION.md` → `database/RELATIONAL-DESIGN.md` → `api/ERROR-CODES.md`.

**Developer Frontend (Dimas):** `decisions/ADR-001-REACT-STACK.md` → `design/DESIGN-SYSTEM.md` → `design/WIREFRAMES-STOREFRONT.md` (Epic J) → `standards/ERROR-HANDLING-VALIDATION.md` (Section E) → `requirements/EPIC-J-USER-STORIES.md`.

**UI/UX (Maya):** `design/DESIGN-SYSTEM.md` → `design/USER-FLOWS.md` → `design/WIREFRAMES-KASIR.md` → `design/WIREFRAMES-STOREFRONT.md` (Epic J).

**Domain (Rina → Dewi chain):** `domain/FINANCE-ECONOMICS-POS.md` → `requirements/MVP-CHECKLIST.md` → `requirements/FEATURE-BACKLOG.md`.

---

## Dokumen vs Skill (`.cursor/skills/`)

| Gunakan **Docs** (`docs/`) | Gunakan **Skill** (`.cursor/skills/`) |
|------------------------------|----------------------------------------|
| Spesifikasi bisnis, arsitektur, schema, wireframe, standar teknis | Instruksi operasional agent: workflow, template komunikasi, anti-patterns |
| Referensi permanen untuk seluruh tim & owner | Konteks Cursor saat agent dipanggil (`@docs`, `@senior-dev`, dll.) |
| Review via PR seperti kode | Di-load otomatis saat task relevan |
| Bahasa Indonesia untuk user-facing; English OK untuk teknis | Knowledge Base 2026 per divisi |

**Skill files (referensi, jangan duplikat isi docs):**

| Agent | Skill Path |
|-------|------------|
| Rina | `.cursor/skills/pos-domain-expert/SKILL.md` |
| Dewi | `.cursor/skills/pos-business-analyst/SKILL.md` |
| Hendra | `.cursor/skills/pos-project-planner/SKILL.md` |
| Fitri | `.cursor/skills/pos-documentation/SKILL.md` |
| Arif | `.cursor/skills/pos-integration/SKILL.md` |
| Eko | `.cursor/skills/pos-algorithm/SKILL.md` |
| Maya | `.cursor/skills/pos-ui-ux/SKILL.md` |
| Fajar | `.cursor/skills/pos-senior-developer/SKILL.md` |
| Dimas | `.cursor/skills/pos-senior-frontend/SKILL.md` |
| Yoga | `.cursor/skills/pos-devops/SKILL.md` |

---

## Pemeliharaan Indeks

| Item | Detail |
|------|--------|
| **Owner** | Fitri Nugroho (`@docs`) |
| **Review** | Setiap dokumen baru / rename / hapus |
| **Artefak** | `docs/INDEX.md`, `docs/INDEX.json`, header cross-link di setiap doc |
| **Workflow** | Lihat `.cursor/skills/pos-documentation/SKILL.md` → section *Indexing & Navigasi Dokumen* |

**Total dokumen terindeks:** 40 file di `docs/` (38 konten + 2 meta) + 3 referensi root = **43 entri** (termasuk Finance AR/AP integration, Pilot go-live).
