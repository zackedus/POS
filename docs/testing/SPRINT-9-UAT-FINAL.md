> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Testing | Audience: Pak Zaki, Fajar, Dimas, Fitri, Budi

# Sprint 9 — UAT Final Checklist

> **Tanggal:** 2 Juni 2026  
> **Status:** **CLOSED** — tervalidasi tanpa blocker  
> **Owner uji:** Fajar (Backend/API), Dimas (Frontend), Fitri (Docs), Budi (Orchestrator)

---

## Scope UAT Final

1. Export laporan harian — `GET /reports/daily/export` (`format=json|csv`, UTF-8 BOM untuk Excel).
2. Multi-outlet API — `GET /reports/outlets`, aturan `outletId` wajib jika JWT >1 outlet.
3. Admin shell web — `AdminLayout` di `/dashboard`, `/master/*`, `/shift/open` (nav konsisten).
4. Outlet picker + tombol **Ekspor** CSV di dashboard (konsumsi API Sprint 9).
5. RBAC — OWNER/MANAGER untuk reports & export; CASHIER tetap di `/pos`.

---

## Hasil Eksekusi Ringkas

| Area | Hasil | Bukti utama |
|---|---|---|
| Export JSON (`format=json`) | ✅ PASS | SCR-R04: envelope + `exportedAt` + `report` |
| Export CSV (`format=csv`) | ✅ PASS | SCR-R04: body CSV + UTF-8 BOM; util `buildDailySalesCsv` |
| List outlets (SCR-R03) | ✅ PASS | Owner: semua outlet tenant; manager: assigned only |
| Multi-outlet tanpa `outletId` | ✅ PASS | 400 `INVALID_INPUT` pada daily/export |
| RBAC export & outlets | ✅ PASS | Smoke class-level `ReportsController` |
| Admin shell (master/shift) | ✅ PASS | Test `DashboardShell`, master pages, shift open |
| Outlet picker + `outletId` query | ✅ PASS | `outlet-selection.test.ts`, `dashboard/page.test.tsx` |
| Tombol Ekspor CSV web | ✅ PASS | Test dashboard: trigger unduh + fallback error |
| RBAC kasir → `/pos` | ✅ PASS | `rbac.test.ts` + guard dashboard |

---

## Bukti Verifikasi Teknis (Re-run Final — 2 Juni 2026)

### API (`@barokah/api`)

- `npm run lint --workspace=@barokah/api` ✅
- `npm run typecheck --workspace=@barokah/api` ✅
- `npm run test --workspace=@barokah/api` ✅ (**45/45** pass, termasuk SCR-R03, SCR-R04, CSV util)
- `npm run build --workspace=@barokah/api` ✅

### Web (`@barokah/web`)

- `npm run lint --workspace=@barokah/web` ✅
- `npm run typecheck --workspace=@barokah/web` ✅
- `npm run test --workspace=@barokah/web` ✅ (**33/33** pass)
- `npm run build --workspace=@barokah/web` ✅ (⚠ warning ESLint plugin Next.js — non-blocking, carry-over Sprint 10)

---

## Checklist UAT Final (Pak Zaki)

- [x] Login **owner** → `/dashboard` — sidebar tetap saat buka Produk, Kategori, Buka Shift.
- [x] Klik **Ekspor** → file CSV `laporan-harian-*.csv` terunduh (API `:3000` aktif).
- [x] Ubah tanggal → **Muat ulang** → widget omzet mengikuti `outletId` + tanggal.
- [x] `GET /reports/outlets` (owner) → daftar cabang + metadata seleksi.
- [x] `GET /reports/daily/export?format=csv` → unduhan valid; `format=json` → envelope benar.
- [x] Manager cabang lain → `outletId` asing → **403**.
- [x] Login **kasir** → `/pos`; akses `/dashboard` → redirect `/pos`.

---

## Yang Bisa Langsung Dites (Dev)

**Prasyarat:** API port **3000**, web port **3001**, PostgreSQL + seed aktif (`npm run docker:up` + `npm run db:seed`).

| Layar / Endpoint | URL |
|---|---|
| Login | http://localhost:3001/login |
| Dashboard (Owner) | http://localhost:3001/dashboard |
| Master Produk | http://localhost:3001/master/products |
| Master Kategori | http://localhost:3001/master/categories |
| Buka Shift | http://localhost:3001/shift/open |
| Kasir | http://localhost:3001/pos |
| Health API | http://localhost:3000/api/v1/health |
| List outlets | `GET http://localhost:3000/api/v1/reports/outlets` |
| Export harian (CSV) | `GET http://localhost:3000/api/v1/reports/daily/export?outletId=<uuid>&date=YYYY-MM-DD&format=csv` |
| Export harian (JSON) | `GET http://localhost:3000/api/v1/reports/daily/export?outletId=<uuid>&format=json` |
| Laporan harian | `GET http://localhost:3000/api/v1/reports/daily?outletId=<uuid>&date=YYYY-MM-DD` |

**Kredensial seed (dev):**

| Peran | Email | Password |
|-------|-------|----------|
| Owner | `owner@barokah.local` | `Owner123!` |
| Manager | `manager@barokah.local` | `Manager123!` |
| Kasir | `kasir@barokah.local` | `Kasir123!` |

**Flow uji manual singkat (~8 menit):**

1. Login owner → buka `/dashboard` → pastikan widget omzet & payment mix tampil.
2. Klik **Ekspor** → pastikan CSV terunduh; buka di Excel → encoding Indonesia benar (BOM).
3. Navigasi ke **Produk** / **Kategori** / **Buka Shift** → sidebar admin tidak hilang.
4. Ubah tanggal → **Muat ulang** → data mengikuti tanggal.
5. Logout → login kasir → pastikan di `/pos`; coba URL `/dashboard` → redirect `/pos`.
6. (Opsional) `curl` dengan token owner ke `/reports/outlets` dan `/reports/daily/export?format=json`.

---

## Isu Tersisa (Non-Blocking) + Mitigasi

| Isu | Klasifikasi | Mitigasi |
|---|---|---|
| Seed dev hanya 1 outlet — picker multi-cabang belum teruji visual | Non-blocking | Sprint 10: perluas seed 2 outlet — Fajar + Yoga |
| Export PDF/Excel terjadwal | Out of scope Sprint 9 | Fase 2 backlog — Fajar + Fitri |
| Warning ESLint plugin Next.js saat build web | Non-blocking | Sprint 10 P3 — Dimas + Yoga |
| Konsolidasi lintas cabang satu file | Out of scope MVP | Fase 2 — per-outlet export cukup operasional |

---

## Keputusan

**Sprint 9 UAT final dinyatakan PASS.** Tidak ada blocker untuk penutupan sprint; acceptance criteria plan (backend + frontend) dan progress report terpenuhi.
