> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Requirements | Audience: Pak Zaki, Budi, Hendra, Fajar, Dimas, Fitri

# Sprint 9 Plan — Export Laporan & Multi-Outlet (Gabungan)

> **Periode:** 2 Juni 2026  
> **Status:** **CLOSED** (backend + frontend + UAT final)  
> **Owner backend:** Fajar (Backend/API)  
> **Owner frontend:** Dimas — `AdminLayout`, outlet picker, tombol ekspor  
> **UAT final:** [SPRINT-9-UAT-FINAL.md](../testing/SPRINT-9-UAT-FINAL.md)  
> **Carry-over sumber:** [SPRINT-8-CLOSURE.md](../sprint/SPRINT-8-CLOSURE.md)  
> **Scope produk:** Retail bahan bangunan — **no F&B** (ADR-003)

---

## Tujuan Sprint 9 (Gabungan)

Menyelesaikan **export laporan harian** (JSON/CSV) untuk owner/manager, **dukungan multi-outlet** pada modul reports (daftar outlet + aturan `outletId` eksplisit), **shell admin web** terintegrasi, **picker outlet + tombol ekspor** di dashboard, serta test + UAT + dokumentasi sprint.

---

## Scope In

**Backend**

1. `GET /api/v1/reports/daily/export` — unduh laporan harian (`format=json|csv`, default `json`).
2. `GET /api/v1/reports/outlets` — daftar outlet yang boleh diakses user (owner: semua cabang tenant; manager: cabang ter-assign).
3. Metadata multi-outlet: `requiresOutletSelection`, `defaultOutletId` untuk konsumsi frontend picker.
4. Test SCR-R03 (outlet scoping), SCR-R04 (export), util CSV, RBAC smoke.

**Frontend**

5. `AdminLayout` untuk `/dashboard`, `/master/*`, `/shift/open`.
6. Outlet picker header + propagasi `outletId` ke laporan harian.
7. Tombol **Ekspor** CSV di dashboard.
8. Test web: outlet selection, shell, dashboard export.

**Dokumentasi & UAT**

9. Plan, progress, closure, UAT final, indeks.

## Scope Out

- Export PDF/Excel terjadwal (Fase 2+).
- Konsolidasi lintas cabang dalam satu laporan (Fase 2).
- Perubahan schema Prisma / multi-tenant enterprise.

---

## Deliverables Teknis

| Endpoint | Deskripsi |
|----------|-----------|
| `GET /api/v1/reports/daily/export` | Export laporan harian; `format=csv` → file CSV (UTF-8 BOM); `format=json` → envelope + `exportedAt` |
| `GET /api/v1/reports/outlets` | Daftar outlet + flag seleksi cabang |
| *(existing)* `GET /reports/daily` dll. | Tetap; `outletId` wajib jika user punya >1 outlet di JWT |

**Query params export:** `outletId`, `date` (`YYYY-MM-DD`), `format` (`json` \| `csv`).

---

## Acceptance Criteria

- [x] Hanya OWNER/MANAGER mengakses export & list outlets.
- [x] Owner dapat query outlet mana pun di tenant; manager terbatas `outletIds`.
- [x] User multi-outlet tanpa `outletId` → 400 `INVALID_INPUT` pada laporan/export.
- [x] CSV berisi ringkasan harian + baris payment mix; BOM untuk Excel Indonesia.
- [x] `@barokah/api` lolos lint, typecheck, test, build (45/45).
- [x] `@barokah/web` lolos lint, typecheck, test, build (33/33).
- [x] UAT final PASS — [SPRINT-9-UAT-FINAL.md](../testing/SPRINT-9-UAT-FINAL.md).

---

## Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Frontend belum ada picker outlet | Medium | API `GET /reports/outlets` + flag siap; handoff Dimas |
| PDF/Excel diminta Pak Zaki | Low | Defer Fase 2; CSV MVP cukup operasional harian |
| StreamableFile vs envelope | Low | ResponseInterceptor skip `StreamableFile` |

---

## Handoff — Sprint 10 (3 prioritas)

| # | Prioritas | Owner |
|---|-----------|-------|
| 1 | **Void transaksi + audit trail (P0 MVP)** — approval manager, record terpisah immutable | Rina → Dewi → **Fajar** + **Dimas** |
| 2 | **Struk digital & cetak thermal ESC/POS (P0)** — spec Arif, API receipt, trigger post-checkout kasir | **Arif** → **Fajar** + **Dimas** |
| 3 | **Hardening release** — seed 2 outlet dev, ESLint Next flat config, smoke UAT per release | **Yoga** + **Dimas** + **Fitri** |

| From | To | Task |
|------|-----|------|
| Budi | Hendra | Draft SPRINT-10-PLAN dari prioritas di atas |
| Fitri | Pak Zaki | Changelog + indeks Sprint 9 CLOSED |
