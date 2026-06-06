> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Rapat | Audience: semua tim

# Rapat Kickoff Tim — Barokah Core POS

> **Tanggal:** 1 Juni 2026  
> **Pemilik proyek:** Zaki (**Pak Zaki**) — penerima laporan dan keputusan bisnis  
> **Facilitator:** Budi Santoso (CEO) — mempresentasikan ke Pak Zaki  
> **Durasi:** 90 menit  
> **Referensi:** [MVP-CHECKLIST.md](../requirements/MVP-CHECKLIST.md), [FINANCE-ECONOMICS-POS.md](../domain/FINANCE-ECONOMICS-POS.md), [USER-FLOWS.md](../design/USER-FLOWS.md), [WIREFRAMES-KASIR.md](../design/WIREFRAMES-KASIR.md), [DATABASE-ANALYSIS.md](../database/DATABASE-ANALYSIS.md), [OVERVIEW.md](../architecture/OVERVIEW.md)

---

## Peserta

| Nama | Jabatan | Agent ID |
|------|---------|----------|
| Zaki | Pemilik Proyek | — |
| Budi Santoso | CEO / Orchestrator | `@budi` |
| Rina Wulandari | Spesialis POS Domain | `@pos-expert` |
| Dewi Kartika | Business Analyst | `@analyst` |
| Hendra Pratama | Project Planner | `@planner` |
| Fitri Nugroho | Documentation Specialist | `@docs` |
| Arif Hidayat | Integration Specialist | `@integration` |
| Eko Susilo | Algorithm Specialist | `@algorithm` |
| Maya Anggraini | UI/UX Specialist | `@ui-ux` |
| Fajar Ramadhan | Senior Developer | `@senior-dev` |
| Yoga Permana | DevOps Engineer | `@devops` |

---

## Agenda

1. Visi produk & scope MVP (8 minggu / Sprint 1–4)
2. Fitur P0 vs P1 — lock prioritas
3. Workflow operasional kasir
4. Financial pulse MVP (Rina)
5. Urutan modul teknis & feasibility
6. Integrasi P0 (QRIS, printer)
7. Algoritma PPN & diskon MVP
8. Infra readiness & Definition of Done
9. Sprint 1 plan & action items

---

## Diskusi per Topik

### 1. Visi & Scope MVP

---
**Budi** · CEO
Halo tim, selamat datang di kickoff Barokah Core POS. Visi kita: POS profesional yang memberi merchant SMB Indonesia **denyut keuangan harian** — bukan sekadar mesin kasir. MVP 8 minggu (Sprint 1–4), fokus satu outlet dulu. Multi-outlet, inventory penuh, dan promo engine kompleks ditunda Fase 2. Target akhir Sprint 4: kasir bisa Login → Buka Shift → Transaksi → Checkout → Tutup Shift dengan laporan harian.
---

---
**Rina** · Spesialis POS Domain
Halo tim, dari sudut operasional toko UMKM Indonesia, MVP wajib menjawab tiga pertanyaan merchant setiap hari: *"Berapa omzet hari ini?"*, *"Uang cash di laci cocok tidak?"*, *"Metode bayar dominan apa?"* Checklist [MVP-CHECKLIST.md](../requirements/MVP-CHECKLIST.md) sudah solid. Saya usulkan **financial pulse P0** untuk MVP: (1) laporan penjualan harian dengan payment mix, (2) rekonsiliasi shift kas dengan selisih + catatan, (3) field `cost_price` di master produk (opsional diisi merchant) agar laba kotor bisa ditampilkan Sprint 4, (4) konfigurasi PKP/non-PKP + PPN 11% per tenant. Void/refund dan import CSV produk **P1** — jangan masuk Sprint 1–2 agar kasir core tidak terlambat.
---

### 2. User Story Priority

---
**Dewi** · Business Analyst
Halo Hendra, dari checklist Rina saya kelompokkan user story menjadi 4 epic MVP. **Epic A — Foundation (Sprint 1):** login, RBAC, tenant/outlet seed. **Epic B — Master & Shift (Sprint 2):** CRUD produk/kategori, buka/tutup shift. **Epic C — Transaksi Core (Sprint 3):** scan, keranjang, checkout cash/transfer, struk digital. **Epic D — Payment & Close Loop (Sprint 4):** QRIS, split payment, hold bill, thermal printer, laporan harian + shift recon. Prioritas MoSCoW: Must = alur Login→Shift→Transaksi→Checkout→Tutup Shift; Should = QRIS + split payment; Could = void (P1); Won't (MVP) = offline mobile, multi-outlet sync, promo engine.
---

### 3. Sprint Plan Sprint 1–2

---
**Hendra** · Project Planner
Halo tim, timeline realistis 4 sprint × 2 minggu:

| Sprint | Periode | Goal |
|--------|---------|------|
| **Sprint 1** | 2–15 Jun 2026 | Foundation: infra, schema, auth, login UI |
| **Sprint 2** | 16–29 Jun 2026 | Master data + buka shift |
| **Sprint 3** | 30 Jun – 13 Jul 2026 | Transaksi kasir core + checkout cash/transfer |
| **Sprint 4** | 14–27 Jul 2026 | QRIS, printer, hold, split pay, laporan & tutup shift |

Sprint 1 **bukan** transaksi — fokus fondasi agar Sprint 3 tidak blocked schema. Velocity estimasi: 40 SP per sprint (tim kecil, 1 dev utama Fajar). Buffer 3 hari di akhir Sprint 4 untuk UAT staging.
---

### 4. Workflow UI Kasir

---
**Maya** · UI/UX Specialist
Halo Fajar, workflow final mengacu [USER-FLOWS.md](../design/USER-FLOWS.md) dan [WIREFRAMES-KASIR.md](../design/WIREFRAMES-KASIR.md). Alur locked: **Login (SCR-L01) → Buka Shift modal blocking (SCR-S01) → Kasir Main (SCR-K01) → Checkout modal (SCR-P01) → kembali Kasir Main → Tutup Shift wizard (SCR-C02)**. Perubahan dari draft sebelumnya: (1) split payment tetap P0 tapi UI di Sprint 4 — tab dual metode di SCR-P05; (2) hold bill drawer SCR-H02 masuk Sprint 4, bukan Sprint 3; (3) keyboard shortcut F2/F4/F8 untuk web kasir PC. Wireframe login + buka shift **approved** untuk Sprint 1; kasir main handoff Sprint 2 akhir agar Fajar bisa parallel dengan master data API.
---

### 5. Technical Feasibility & Module Order

---
**Fajar** · Senior Developer
Halo tim, urutan modul backend NestJS yang aman:

1. **Sprint 1:** Prisma schema (22 tabel MVP), Auth module (JWT + refresh), Tenant/Outlet seed, Users + RBAC enum
2. **Sprint 2:** Catalog module (products, categories, units), Shifts module (open only)
3. **Sprint 3:** Transactions module (cart logic client-side, checkout API), Payments (cash/transfer), basic Reports stub
4. **Sprint 4:** QRIS webhook (Midtrans), Receipt service, Held transactions, Shift close + daily report, Audit log

Checkout target < 200ms — cart state di client (Zustand), server hanya persist on confirm. Idempotency via `client_request_id`. Schema sudah align [DATABASE-ANALYSIS.md](../database/DATABASE-ANALYSIS.md). **Blocker:** Fajar butuh Yoga Docker ready Sprint 1 hari 1–2; butuh Eko spec PPN sebelum Sprint 3 checkout UI.
---

### 6. Algoritma PPN & Diskon MVP

---
**Eko** · Algorithm Specialist
Halo Fajar, scope algoritma MVP: **PPN 11% saja** — diskon/promo engine **tidak masuk MVP** (Fase 2). Spec PPN: (1) tenant flag `is_pkp` + `tax_mode` (INCLUSIVE | EXCLUSIVE); (2) per produk `tax_inclusive` boolean; (3) rumus inclusive: `DPP = total / 1.11`, `PPN = total - DPP`; (4) exclusive: `PPN = DPP × 0.11`; (5) rounding ke rupiah per line item, bukan per transaksi — konsisten dengan DJP practice; (6) snapshot tax di `transaction_items`. Diskon manual item-level **Won't MVP** — merchant adjust harga jual jika perlu. Deliverable spec: `docs/algorithms/PPN-SPEC.md` Sprint 1 minggu 2.
---

### 7. Integrasi P0 (QRIS, Printer)

---
**Arif** · Integration Specialist
Halo Fajar, integrasi P0 dua item: **Midtrans QRIS sandbox** (Sprint 4) dan **thermal printer ESC/POS** (Sprint 4). Sprint 1 saya deliver integration readiness doc + sandbox credential setup guide. QRIS flow: create charge → QR display → webhook `settlement` → idempotent handler (Redis dedup key 24h). Fallback: timeout 120s → kasir switch ke cash (sudah di USER-FLOWS). Printer: Web via ESC/POS over network/USB bridge; fallback PDF jika offline (banner SCR-P08). POC Midtrans **parallel Sprint 2** setelah auth ready — tidak block Sprint 1. Split payment: backend terima array `payments[]` — spec di Sprint 3 meski UI Sprint 4.
---

### 8. Dokumentasi Parallel

---
**Fitri** · Documentation Specialist
Halo tim, dokumentasi parallel yang aman Sprint 1: (1) README dev setup — tunggu Yoga Docker compose; (2) API auth endpoints draft setelah Fajar freeze contract; (3) Glosarium merchant (PKP, PPN, shift recon) dari [FINANCE-ECONOMICS-POS.md](../domain/FINANCE-ECONOMICS-POS.md); (4) Template panduan kasir dengan placeholder `[SS: SCR-*]`. **Tidak parallel:** API docs transaksi/checkout sebelum Sprint 3 endpoint merged. Changelog dimulai Sprint 2 first demo. Fitri notify setiap sprint review untuk update docs gate.
---

### 9. Infra Readiness

---
**Yoga** · DevOps Engineer
Halo Fajar, Sprint 1 deliverable infra: Docker Compose (PostgreSQL 16, Redis 7, API, Web dev), `.env.example`, GitHub Actions CI (lint + test + build). Staging environment Sprint 2 akhir — butuh domain staging + secrets Midtrans dari Arif. Production HTTPS Sprint 4 pre-UAT. Monitoring basic: health check `/api/v1/health`. Backup PG daily mulai staging. Sprint 1 hari 1–3: dev environment up agar Fajar unblock migration.
---

### 10. Keputusan Final & Visi

---
**Budi** · CEO
Halo tim, saya kunci keputusan rapat ini. MVP = **financial pulse harian** + **kasir profesional** untuk 1 outlet. Kita tidak over-promise: no offline mobile, no multi-outlet, no promo engine di MVP. Sprint 1 fokus fondasi — bukan demo transaksi. Semua agent follow chain Rina→Dewi→Hendra sebelum implementasi fitur baru. Maya gate UI sebelum Fajar coding layar kasir. Deploy staging Sprint 2 demo; production go-live target akhir Juli 2026 setelah UAT. Terima kasih tim — mari eksekusi.
---

---

## Keputusan Rapat (Decision Log)

| # | Keputusan | Disetujui oleh |
|---|-----------|----------------|
| D-01 | MVP scope = 8 minggu, 4 sprint, 1 outlet per tenant | Budi |
| D-02 | Workflow locked: Login → Buka Shift → Transaksi → Checkout → Tutup Shift | Budi + Maya |
| D-03 | Financial pulse P0: laporan harian, shift recon, payment mix, PPN config, `cost_price` optional | Budi + Rina |
| D-04 | Void/refund, import CSV, e-wallet, offline mobile = P1/P2 — **bukan MVP Sprint 1–4** | Budi |
| D-05 | Diskon/promo engine ditunda Fase 2; MVP hanya PPN 11% | Budi + Eko |
| D-06 | QRIS Midtrans + thermal printer + split payment = P0 Sprint 4 | Budi + Arif |
| D-07 | Hold bill = P0 Sprint 4 (bukan Sprint 3) | Hendra + Maya |
| D-08 | Sprint 1 = foundation only (infra, auth, schema, login) — **no transaksi** | Hendra + Fajar |
| D-09 | Cart state client-side; server persist on checkout confirm | Fajar |
| D-10 | Parallel Sprint 1: Yoga infra + Eko PPN spec draft + Fitri glosarium + Arif integration readiness doc | Budi |
| D-11 | Wireframe login + buka shift approved; kasir main handoff Sprint 2 akhir | Maya |
| D-12 | Staging deploy Sprint 2; production target akhir Juli 2026 | Yoga + Budi |

---

## Fitur MVP Final (Disetujui)

| Fitur | Prioritas | Owner | Sprint |
|-------|-----------|-------|--------|
| Login / Logout + JWT refresh | P0 | Fajar | 1 |
| RBAC (Owner, Manager, Kasir) | P0 | Fajar | 1 |
| Docker dev environment | P0 | Yoga | 1 |
| Prisma schema + migration MVP | P0 | Fajar | 1 |
| CRUD Produk (SKU, barcode, harga, cost_price) | P0 | Fajar | 2 |
| CRUD Kategori + Satuan | P0 | Fajar | 2 |
| Buka Shift (saldo awal kas) | P0 | Fajar | 2 |
| Scan barcode / input SKU | P0 | Fajar | 3 |
| Keranjang (tambah/kurang/hapus qty) | P0 | Fajar + Maya | 3 |
| Checkout Cash | P0 | Fajar | 3 |
| Checkout Transfer manual | P0 | Fajar | 3 |
| Struk digital (PDF/preview) | P0 | Fajar | 3 |
| PPN 11% (PKP/non-PKP, inclusive/exclusive) | P0 | Eko + Fajar | 3 |
| Hold bill (TTL 30 menit) | P0 | Fajar | 4 |
| Split payment (cash + QRIS) | P0 | Fajar + Arif | 4 |
| QRIS Midtrans sandbox | P0 | Arif + Fajar | 4 |
| Cetak struk thermal ESC/POS | P0 | Arif + Fajar | 4 |
| Tutup Shift + rekonsiliasi kas | P0 | Fajar | 4 |
| Laporan penjualan harian + payment mix | P0 | Fajar + Rina | 4 |
| Audit log void/refund | P0 | Fajar | 4 |
| Void transaksi (approval manager) | P1 | Fajar | Post-MVP |
| Refund partial | P1 | Fajar | Post-MVP |
| Import produk CSV | P1 | Fajar | Post-MVP |
| Mobile offline queue | P1 | Fajar | Fase 2 |
| Multi-outlet sync | P1 | Fajar | Fase 2 |
| Promo / diskon engine | P2 | Eko + Fajar | Fase 2 |

---

## Workflow Final

### Alur Utama (Locked)

```
Login → Buka Shift → Transaksi Kasir → Checkout → [loop] → Tutup Shift → Logout
```

### Referensi Design

| Flow | Dokumen | Screen IDs |
|------|---------|------------|
| Login | [USER-FLOWS.md §1](../design/USER-FLOWS.md) | SCR-L01, SCR-L02 |
| Buka Shift | [USER-FLOWS.md §2](../design/USER-FLOWS.md) | SCR-S01 – SCR-S03 |
| Transaksi | [USER-FLOWS.md §3](../design/USER-FLOWS.md) | SCR-K01 – SCR-K04 |
| Hold Bill | [USER-FLOWS.md §4](../design/USER-FLOWS.md) | SCR-H01 – SCR-H03 |
| Checkout | [USER-FLOWS.md §5](../design/USER-FLOWS.md) | SCR-P01 – SCR-P08 |
| Tutup Shift | [USER-FLOWS.md §6](../design/USER-FLOWS.md) | SCR-C01 – SCR-C05 |

### Perubahan dari Draft Sebelumnya

1. **Hold bill** dipindah ke Sprint 4 (sebelumnya tidak terjadwal eksplisit per sprint).
2. **Split payment** UI Sprint 4; API contract `payments[]` disiapkan Sprint 3.
3. **Laba kotor** di laporan harian Sprint 4 hanya jika merchant isi `cost_price` — tidak tampil jika kosong (anti-pattern Rina).
4. **Stok habis** MVP: allow checkout dengan warning (config block ditunda Phase 2).

---

## Risiko & Mitigasi

| # | Risiko | Impact | Mitigasi | Owner |
|---|--------|--------|----------|-------|
| R-01 | Sprint 1 terlalu ambitius → transaksi terlambat | Tinggi | Lock Sprint 1 = foundation only; no transaksi | Hendra |
| R-02 | QRIS webhook delay / sandbox unstable | Sedang | Fallback cash; idempotent handler; POC Sprint 2 | Arif |
| R-03 | Printer hardware variasi merchant | Sedang | PDF fallback + banner offline; ESC/POS standard | Arif |
| R-04 | Scope creep diskon/promo | Tinggi | Eko + Budi gate; Won't MVP | Eko |
| R-05 | Schema change mid-sprint block frontend | Tinggi | Fajar migration Sprint 1 freeze; change request formal | Fajar |
| R-06 | Merchant bingung PKP/PPN | Sedang | Fitri FAQ + onboarding wizard Sprint 4 | Fitri + Rina |
| R-07 | Single dev bottleneck (Fajar) | Tinggi | Parallel docs/spec/infra; Maya review async | Budi |
| R-08 | Rounding PPN selisih struk vs laporan | Sedang | Eko spec per-line rounding; unit test wajib | Eko |

---

## Action Items

| # | Action | Owner | Deadline | Status |
|---|--------|-------|----------|--------|
| A-01 | Docker Compose dev environment up | Yoga | 3 Jun 2026 | Pending |
| A-02 | Prisma schema MVP migration initial | Fajar | 5 Jun 2026 | Pending |
| A-03 | Auth module + JWT refresh API | Fajar | 10 Jun 2026 | Pending |
| A-04 | Login UI (SCR-L01) implement | Fajar | 12 Jun 2026 | Pending |
| A-05 | User story Epic A + AC lengkap | Dewi | 4 Jun 2026 | Pending |
| A-06 | Sprint 1 plan formal publish | Hendra | 2 Jun 2026 | Done → [SPRINT-1-PLAN.md](../requirements/SPRINT-1-PLAN.md) |
| A-07 | Feature backlog consolidated | Dewi + Hendra | 2 Jun 2026 | Done → [FEATURE-BACKLOG.md](../requirements/FEATURE-BACKLOG.md) |
| A-08 | PPN 11% algorithm spec draft | Eko | 10 Jun 2026 | Pending |
| A-09 | Integration readiness doc (QRIS + printer) | Arif | 8 Jun 2026 | Pending |
| A-10 | Glosarium merchant + doc template | Fitri | 8 Jun 2026 | Pending |
| A-11 | Wireframe kasir main final + handoff note | Maya | 28 Jun 2026 | Pending |
| A-12 | Midtrans sandbox POC | Arif | 29 Jun 2026 | Pending |
| A-13 | CI pipeline (lint, test, build) | Yoga | 10 Jun 2026 | Pending |
| A-14 | Review & approve Sprint 1 scope | Budi | 2 Jun 2026 | Done |

---

## Handoff Log

| From | To | Task | Deliverable | Blocked by | Parallel OK? | Next action |
|------|-----|------|-------------|------------|--------------|-------------|
| Budi · CEO | Rina · POS | Kickoff scope alignment | MVP-CHECKLIST review | — | — | Rina validate financial pulse |
| Rina · POS | Dewi · Analyst | Checklist → user story | MVP-CHECKLIST.md | — | Tidak | Dewi tulis Epic A–D |
| Dewi · Analyst | Hendra · Planner | User story → sprint plan | FEATURE-BACKLOG.md | — | Tidak | Hendra publish Sprint 1–4 |
| Hendra · Planner | Yoga · DevOps | Sprint 1 infra task | SPRINT-1-PLAN.md | — | Ya (infra independen) | Yoga Docker Compose hari 1–3 |
| Hendra · Planner | Fajar · Senior Dev | Sprint 1 schema + auth | SPRINT-1-PLAN.md | Yoga Docker | Tidak — tunggu Docker | Fajar migration + auth API |
| Maya · UI/UX | Fajar · Senior Dev | Login wireframe handoff | WIREFRAMES-KASIR.md § SCR-L01 | — | Ya setelah auth API | Fajar implement login page |
| Eko · Algorithm | Fajar · Senior Dev | PPN spec | docs/algorithms/PPN-SPEC.md (draft) | — | Ya (spec independen) | Fajar review sebelum Sprint 3 |
| Arif · Integration | Fajar · Senior Dev | Integration readiness | docs/integration/README.md (draft) | — | Ya | Arif POC Midtrans Sprint 2 |
| Fajar · Senior Dev | Fitri · Docs | Auth API contract freeze | OpenAPI auth endpoints | Fajar auth merged | Tidak | Fitri update API docs |
| Yoga · DevOps | Fajar · Senior Dev | Dev environment ready | docker-compose.yml | — | Tidak — Fajar blocked | Fajar run migration |
| Budi · CEO | Fitri · Docs | Meeting minutes publish | docs/meetings/2026-06-01-KICKOFF-MEETING.md | — | Ya | Fitri link di changelog index |

---

## Lampiran

- [FEATURE-BACKLOG.md](../requirements/FEATURE-BACKLOG.md)
- [SPRINT-1-PLAN.md](../requirements/SPRINT-1-PLAN.md)
- [MVP-CHECKLIST.md](../requirements/MVP-CHECKLIST.md)
- [COORDINATION-PLAYBOOK.md](../team/COORDINATION-PLAYBOOK.md)

---

*Notulen disusun oleh Fitri Nugroho · disetujui Budi Santoso · 1 Juni 2026*
