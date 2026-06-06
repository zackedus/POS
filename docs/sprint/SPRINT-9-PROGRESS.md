> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Sprint | Audience: Pak Zaki, Hendra, Fajar, Dimas, Fitri

# Sprint 9 — Progress Report (Gabungan)

> **Tanggal update:** 2 Juni 2026  
> **Status sprint:** **CLOSED**  
> **Orchestrator:** Budi Santoso (CEO)  
> **Referensi:** [SPRINT-9-PLAN.md](../requirements/SPRINT-9-PLAN.md), [SPRINT-9-UAT-FINAL.md](../testing/SPRINT-9-UAT-FINAL.md), [SPRINT-8-CLOSURE.md](./SPRINT-8-CLOSURE.md)

---

## Status Ringkas

| Jalur | Progress | Status |
|-------|----------|--------|
| Backend — export + multi-outlet | 100% | **CLOSED** |
| Frontend — shell + outlet picker + export UI | 100% | **CLOSED** |
| Dokumentasi Sprint 9 | 100% | **CLOSED** |
| UAT final Sprint 9 | 100% | **CLOSED** — [SPRINT-9-UAT-FINAL.md](../testing/SPRINT-9-UAT-FINAL.md) PASS |

---

## Deliverables Backend (Fajar)

- `GET /api/v1/reports/daily/export` — JSON (`format=json`) atau unduh CSV (`format=csv`)
- `GET /api/v1/reports/outlets` — daftar cabang + `requiresOutletSelection` / `defaultOutletId`
- Util `buildDailySalesCsv` + UTF-8 BOM untuk Excel
- `ResponseInterceptor` — pass-through `StreamableFile` (unduhan file)
- Test: SCR-R03, SCR-R04, CSV util, RBAC smoke (export + outlets)

---

## Verifikasi Teknis (@barokah/api)

| Perintah | Hasil |
|----------|-------|
| `npm run lint --workspace=@barokah/api` | ✅ |
| `npm run typecheck --workspace=@barokah/api` | ✅ |
| `npm run test --workspace=@barokah/api` | ✅ **45/45** (re-run 2 Jun 2026) |
| `npm run build --workspace=@barokah/api` | ✅ |

---

## Deliverables Frontend (Dimas)

### 1) Admin shell bersama (P1)

- `AdminLayout` dipakai `/dashboard`, `/master/*`, `/shift/open`
- Sidebar nav konsisten; judul header dinamis per rute

### 2) Outlet picker (P2)

- `GET /reports/outlets` setelah login admin
- Picker header jika `requiresOutletSelection`; `outletId` ke laporan harian

### 3) Tombol Ekspor (P3)

- `GET /reports/daily/export?format=csv` — unduh CSV otomatis
- Pesan fallback jika gagal

### 4) Test web baru / diperluas

- `outlet-selection.test.ts`, `DashboardShell.test.tsx`
- `dashboard/page.test.tsx` (+outletId, +ekspor) — **33/33** pass

---

## Verifikasi Teknis (@barokah/web)

| Perintah | Hasil |
|----------|-------|
| `npm run lint --workspace=@barokah/web` | ✅ |
| `npm run typecheck --workspace=@barokah/web` | ✅ |
| `npm run test --workspace=@barokah/web` | ✅ **33/33** (re-run 2 Jun 2026) |
| `npm run build --workspace=@barokah/web` | ✅ (⚠ warning ESLint Next plugin — non-blocking) |

---

## URL Uji (dev)

| Halaman | URL |
|---------|-----|
| Dashboard | http://localhost:3001/dashboard |
| Master Produk | http://localhost:3001/master/products |
| Master Kategori | http://localhost:3001/master/categories |
| Buka Shift | http://localhost:3001/shift/open |

Kredensial: `owner@barokah.local` / `Owner123!` — API `:3000`, web `:3001`.

---

## Blocker / Carry-over

| Item | Status |
|------|--------|
| PDF/Excel terjadwal | Defer Fase 2 |
| ESLint Next.js plugin (build warning) | Non-blocking — opsional sprint berikutnya |
| UAT picker 2 cabang | Seed dev masih 1 outlet — opsional perluas seed |
